import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, phrases, userPhrases } from '@/lib/db';
import { eq, and, or, ilike, sql, desc, asc, inArray, isNull } from 'drizzle-orm';
import { difficultyEnum } from '@/lib/db/schema';

const VALID_DIFFICULTIES = difficultyEnum.enumValues;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const difficulty = searchParams.get('difficulty') || '';
  const status = searchParams.get('status') || 'all'; // all, learned, unlearned
  const favorite = searchParams.get('favorite') === 'true';
  const tag = searchParams.get('tag') || '';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const sortBy = searchParams.get('sortBy') || 'relevance';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Build where conditions
  const conditions = [];

  const likeTerm = `%${search.toLowerCase()}%`;
  const prefixTerm = `${search.toLowerCase()}%`;

  if (search) {
    // Pencarian HANYA di frasa Inggris (phrase) + terjemahannya (translation).
    // ILIKE = case-insensitive & cocok sebagian kata
    // (setara toLowerCase().includes() di client).
    conditions.push(
      or(
        ilike(phrases.phrase, likeTerm),
        ilike(phrases.translation, likeTerm)
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

  // Ranking: exact match > prefix > substring (hanya pada frasa Inggris).
  const rankingExpr = search
    ? sql`(
        CASE
          WHEN lower(${phrases.phrase}) = lower(${search}) THEN 100
          WHEN lower(${phrases.phrase}) LIKE ${prefixTerm} THEN 50
          WHEN lower(${phrases.phrase}) LIKE ${likeTerm} THEN 25
          ELSE 0
        END
      )`
    : sql`0`;

  // Order by
  let orderBy;
  if (sortBy === 'relevance' && search) {
    orderBy = [
      desc(rankingExpr),
      asc(sql`LENGTH(${phrases.phrase})`),
      asc(phrases.phrase),
    ];
  } else {
    const orderByCol = sortBy === 'phrase' ? phrases.phrase : phrases.createdAt;
    orderBy = sortOrder === 'desc' ? desc(orderByCol) : asc(orderByCol);
  }

  // 1 query saja: data + total (window function) → 2x lebih cepat.
  const rows = await db
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
      total: sql<number>`count(*) over()`,
      ...(search ? { relevance: rankingExpr } : {}),
    })
    .from(phrases)
    .leftJoin(userPhrases, userPhrasesJoin)
    .where(whereClause)
    .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
    .limit(limit)
    .offset(offset);

  const total = rows.length > 0 ? Number(rows[0].total ?? 0) : offset;

  return NextResponse.json({
    data: rows.map(({ total: _t, ...r }) => ({
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