import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, vocabulary, userVocabulary } from '@/lib/db';
import { eq, and, or, ilike, sql, desc, asc, inArray, isNull } from 'drizzle-orm';
import { partOfSpeechEnum, difficultyEnum } from '@/lib/db/schema';

const VALID_PARTS_OF_SPEECH = partOfSpeechEnum.enumValues;
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
  const partOfSpeech = searchParams.get('partOfSpeech') || '';
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
        sql`${sql.raw('vocabulary.search_vector')} @@ ${tsquery}`,
        ilike(vocabulary.word, `%${search.toLowerCase()}%`),
        ilike(vocabulary.translation, `%${search.toLowerCase()}%`),
        ilike(vocabulary.definition, `%${search.toLowerCase()}%`)
      )
    );
  }

  // Handle multiple partOfSpeech values (comma-separated)
  if (partOfSpeech) {
    const parts = partOfSpeech.split(',').filter(Boolean);
    const validParts = parts.filter(p => VALID_PARTS_OF_SPEECH.includes(p as any));
    if (validParts.length === 1) {
      conditions.push(eq(vocabulary.partOfSpeech, validParts[0] as any));
    } else if (validParts.length > 1) {
      conditions.push(inArray(vocabulary.partOfSpeech, validParts as any));
    }
  }

  // Handle multiple difficulty values (comma-separated)
  if (difficulty) {
    const diffs = difficulty.split(',').filter(Boolean);
    const validDiffs = diffs.filter(d => VALID_DIFFICULTIES.includes(d as any));
    if (validDiffs.length === 1) {
      conditions.push(eq(vocabulary.difficulty, validDiffs[0] as any));
    } else if (validDiffs.length > 1) {
      conditions.push(inArray(vocabulary.difficulty, validDiffs as any));
    }
  }

  // Tag filter (array contains)
  if (tag) {
    conditions.push(sql`${vocabulary.tags} @> ARRAY[${tag}]::text[]`);
  }

  // Build user vocabulary join for flags
  const userVocabJoin = and(
    eq(userVocabulary.vocabularyId, vocabulary.id),
    eq(userVocabulary.userId, session.user.id)
  );

  // Status filter (learned/unlearned) - needs user_vocabulary join
  if (status !== 'all') {
    conditions.push(
      status === 'learned'
        ? eq(userVocabulary.isLearned, true)
        : or(
            eq(userVocabulary.isLearned, false),
            isNull(userVocabulary.isLearned)
          )
    );
  }

  // Filter favorit saja
  if (favorite) {
    conditions.push(eq(userVocabulary.isFavorite, true));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build ranking expression using PostgreSQL's ts_rank_cd (cover density ranking)
  // This gives proper relevance scores based on:
  // - Frequency of term in document
  // - Proximity of terms (for multi-word queries)
  // - Position (earlier = higher rank)
  // - Weight (A=word, B=translation, C=definition, D=example)
  const rankingExpr = search && tsquerySql
    ? sql`ts_rank_cd(${sql.raw('vocabulary.search_vector')}, ${sql.raw(tsquerySql)}, 32)` // 32 = rank normalization by document length
    : sql`0`;

  // Order by
  let orderBy;
  if (sortBy === 'relevance' && search) {
    // Primary: ts_rank_cd relevance (desc), Secondary: word length (asc - shorter first), Tertiary: alphabetical
    orderBy = [
      desc(rankingExpr),
      asc(sql`LENGTH(${vocabulary.word})`),
      asc(vocabulary.word),
    ];
  } else {
    const orderByCol = sortBy === 'word' ? vocabulary.word : vocabulary.createdAt;
    orderBy = sortOrder === 'desc' ? desc(orderByCol) : asc(orderByCol);
  }

  // Execute query
  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: vocabulary.id,
        word: vocabulary.word,
        translation: vocabulary.translation,
        definition: vocabulary.definition,
        partOfSpeech: vocabulary.partOfSpeech,
        difficulty: vocabulary.difficulty,
        exampleSentence: vocabulary.exampleSentence,
        phonetic: vocabulary.phonetic,
        v1: vocabulary.v1,
        v2: vocabulary.v2,
        v3: vocabulary.v3,
        v_ing: vocabulary.v_ing,
        v_s: vocabulary.v_s,
        plural_form: vocabulary.plural_form,
        synonyms: vocabulary.synonyms,
        antonyms: vocabulary.antonyms,
        notes: vocabulary.notes,
        tags: vocabulary.tags,
        isFavorite: userVocabulary.isFavorite,
        isLearned: userVocabulary.isLearned,
        // Include relevance score for debugging/frontend
        ...(search ? { relevance: rankingExpr } : {}),
      })
      .from(vocabulary)
      .leftJoin(userVocabulary, userVocabJoin)
      .where(whereClause)
      .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(vocabulary)
      .leftJoin(userVocabulary, userVocabJoin)
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