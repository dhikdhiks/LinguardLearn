import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, phrases, userPhrases } from '@/lib/db';
import { eq, and, or, ilike, sql, desc, asc, inArray, isNull } from 'drizzle-orm';

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
  const sortBy = searchParams.get('sortBy') || 'phrase';
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  // Build where conditions
  const conditions = [];

  // Search across phrase, translation
  if (search) {
    const term = `%${search.toLowerCase()}%`;
    conditions.push(
      or(
        ilike(phrases.phrase, term),
        ilike(phrases.translation, term)
      )
    );
  }

  // Handle multiple difficulty values (comma-separated)
  if (difficulty) {
    const diffs = difficulty.split(',').filter(Boolean);
    if (diffs.length === 1) {
      conditions.push(eq(phrases.difficulty, diffs[0] as any));
    } else if (diffs.length > 1) {
      conditions.push(inArray(phrases.difficulty, diffs as any));
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

  // Order by
  const orderByCol = sortBy === 'phrase' ? phrases.phrase : phrases.createdAt;
  const orderBy = sortOrder === 'desc' ? desc(orderByCol) : asc(orderByCol);

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
      })
      .from(phrases)
      .leftJoin(userPhrases, userPhrasesJoin)
      .where(whereClause)
      .orderBy(orderBy)
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