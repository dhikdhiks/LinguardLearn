import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, vocabulary, userVocabulary } from '@/lib/db';
import { eq, and, or, ilike, sql, desc, asc, inArray, isNull } from 'drizzle-orm';

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
  const sortBy = searchParams.get('sortBy') || 'word';
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  // Build where conditions
  const conditions = [];

  // Search across word, translation, definition
  if (search) {
    const term = `%${search.toLowerCase()}%`;
    conditions.push(
      or(
        ilike(vocabulary.word, term),
        ilike(vocabulary.translation, term),
        ilike(vocabulary.definition, term)
      )
    );
  }

  // Handle multiple partOfSpeech values (comma-separated)
  if (partOfSpeech) {
    const parts = partOfSpeech.split(',').filter(Boolean);
    if (parts.length === 1) {
      conditions.push(eq(vocabulary.partOfSpeech, parts[0] as any));
    } else if (parts.length > 1) {
      conditions.push(inArray(vocabulary.partOfSpeech, parts as any));
    }
  }

  // Handle multiple difficulty values (comma-separated)
  if (difficulty) {
    const diffs = difficulty.split(',').filter(Boolean);
    if (diffs.length === 1) {
      conditions.push(eq(vocabulary.difficulty, diffs[0] as any));
    } else if (diffs.length > 1) {
      conditions.push(inArray(vocabulary.difficulty, diffs as any));
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

  // Order by
  const orderByCol = sortBy === 'word' ? vocabulary.word : vocabulary.createdAt;
  const orderBy = sortOrder === 'desc' ? desc(orderByCol) : asc(orderByCol);

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
      })
      .from(vocabulary)
      .leftJoin(userVocabulary, userVocabJoin)
      .where(whereClause)
      .orderBy(orderBy)
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