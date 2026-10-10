import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, phrases, userPhrases } from '@/lib/db';
import { eq, and, or, ilike, sql, desc, asc, inArray, isNull } from 'drizzle-orm';
import { difficultyEnum } from '@/lib/db/schema';

const VALID_DIFFICULTIES = difficultyEnum.enumValues;

/**
 * Sanitize search term for tsquery - remove special characters
 * websearch_to_tsquery handles this automatically (supports quotes, OR, -)
 */
function sanitizeSearchTerm(term: string): string {
  return term.trim().replace(/[^\w\s\-']/g, ' ');
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const status = searchParams.get('status') || 'all'; // all, learned, unlearned
  const favorite = searchParams.get('favorite') === 'true';
  const tag = searchParams.get('tag') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const sortBy = searchParams.get('sortBy') || 'relevance'; // Default to relevance
  const sortOrder = searchParams.get('sortOrder') || 'desc'; // Desc for relevance (highest first)

  // Build where conditions
  const conditions = [];

  // Build tsquery for full-text search if search term provided
  let tsquerySql: string | null = null;

  if (search) {
    const sanitized = sanitizeSearchTerm(search);
    // Use websearch_to_tsquery for better query parsing (supports quotes, OR, -)
    tsquerySql = `websearch_to_tsquery('english', ${sanitized.replace(/'/g, "''")})`;
    const tsquery = sql.raw(tsquerySql);

    // Use full-text search vector if available (migration 0008)
    // Fallback to ILIKE if search_vector column doesn't exist yet
    // Using sql.raw for generated column not in schema
    conditions.push(
      or(
        sql`${sql.raw('phrases.search_vector')} @@ ${tsquery}`,
        ilike(phrases.phrase, `%${search.toLowerCase()}%`),
        ilike(phrases.translation, `%${search.toLowerCase()}%`),
        ilike(phrases.notes, `%${search.toLowerCase()}%`)
      )
    );
  }

  // Handle multiple difficulty values (comma-separated)
  if (difficulty) {
    const diffs = difficulty.split(',').filter(Boolean);
    const validDiffs = diffs.filter(d => VALID_DIFFICULTIES.includes(d as any));
    if (validDiffs.length === 1) {
      conditions.push(eq(phrases.difficulty, validDiffs[0] as any));
    } else if (validDiffs.length > 1) {
      conditions.push(inArray(phrases.difficulty, validDiffs as any));
    }
  }

  // Tag filter (array contains)
  if (tag) {
    conditions.push(sql`${phrases.tags} @> ARRAY[${tag}]::text[]`);
  }

  // Build user phrases join for flags
  const userPhrasesJoin = and(
    eq(userPhrases.phraseId, phrases.id),
    eq(userPhrases.userId, session.user.id)
  );

  // Status filter (learned/unlearned) - needs user_phrases join
  if (status !== 'all') {
    conditions.push(
      status === 'learned'
        ? eq(userPhrases.isLearned, true)
        : or(
            eq(userPhrases.isLearned, false),
            isNull(userPhrases.isLearned)
          )
    );
  }

  // Filter favorit saja
  if (favorite) {
    conditions.push(eq(userPhrases.isFavorite, true));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build ranking expression using PostgreSQL's ts_rank_cd (cover density ranking)
  // Weight: A=phrase, B=translation, C=notes
  const rankingExpr = search && tsquerySql
    ? sql`ts_rank_cd(${sql.raw('phrases.search_vector')}, ${sql.raw(tsquerySql)}, 32)` // 32 = rank normalization by document length
    : sql`0`;

  // Order by
  let orderBy;
  if (sortBy === 'relevance' && search) {
    // Primary: ts_rank_cd relevance (desc), Secondary: phrase length (asc - shorter first), Tertiary: alphabetical
    orderBy = [
      desc(rankingExpr),
      asc(sql`LENGTH(${phrases.phrase})`),
      asc(phrases.phrase),
    ];
  } else {
    const orderByCol = sortBy === 'phrase' ? phrases.phrase : phrases.createdAt;
    orderBy = sortOrder === 'desc' ? desc(orderByCol) : asc(orderByCol);
  }

  // Execute query
  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: phrases.id,
        phrase: phrases.phrase,
        translation: phrases.translation,
        phonetic: phrases.phonetic,
        difficulty: phrases.difficulty,
        tags: phrases.tags,
        notes: phrases.notes,
        isFavorite: userPhrases.isFavorite,
        isLearned: userPhrases.isLearned,
        // Include relevance score for debugging/frontend
        ...(search ? { relevance: rankingExpr } : {}),
      })
      .from(phrases)
      .leftJoin(userPhrases, userPhrasesJoin)
      .where(whereClause)
      .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(phrases)
      .leftJoin(userPhrases, userPhrasesJoin)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      isFavorite: r.isFavorite ?? false,
      isLearned: r.isLearned ?? false,
    })),
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  });
}