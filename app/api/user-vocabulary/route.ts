import { NextRequest, NextResponse } from 'next/server';
import { db, userVocabulary, vocabulary } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all'; // all, learning, reviewed, mastered
  const favorite = searchParams.get('favorite') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const conditions = [eq(userVocabulary.userId, session.user.id)];

  if (status !== 'all') {
    conditions.push(eq(userVocabulary.status, status));
  }

  if (favorite) {
    conditions.push(eq(userVocabulary.isFavorite, true));
  }

  const whereClause = and(...conditions);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: userVocabulary.id,
        vocabularyId: userVocabulary.vocabularyId,
        status: userVocabulary.status,
        isFavorite: userVocabulary.isFavorite,
        isLearned: userVocabulary.isLearned,
        correctCount: userVocabulary.correctCount,
        wrongCount: userVocabulary.wrongCount,
        lastReviewedAt: userVocabulary.lastReviewedAt,
        nextReviewAt: userVocabulary.nextReviewAt,
        easeFactor: userVocabulary.easeFactor,
        interval: userVocabulary.interval,
        repetition: userVocabulary.repetition,
        createdAt: userVocabulary.createdAt,
        updatedAt: userVocabulary.updatedAt,
        // Vocabulary details
        word: vocabulary.word,
        translation: vocabulary.translation,
        definition: vocabulary.definition,
        partOfSpeech: vocabulary.partOfSpeech,
        difficulty: vocabulary.difficulty,
        exampleSentence: vocabulary.exampleSentence,
        phonetic: vocabulary.phonetic,
      })
      .from(userVocabulary)
      .innerJoin(vocabulary, eq(vocabulary.id, userVocabulary.vocabularyId))
      .where(whereClause)
      .orderBy(desc(userVocabulary.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(userVocabulary)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return NextResponse.json({
    data: rows,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { vocabularyId, status, isFavorite, isLearned } = body;

    if (!vocabularyId) {
      return NextResponse.json({ error: 'vocabularyId is required' }, { status: 400 });
    }

    // Check if vocabulary exists
    const vocab = await db.select().from(vocabulary).where(eq(vocabulary.id, vocabularyId)).limit(1);
    if (vocab.length === 0) {
      return NextResponse.json({ error: 'Vocabulary not found' }, { status: 404 });
    }

    // Upsert user vocabulary progress
    const [result] = await db
      .insert(userVocabulary)
      .values({
        userId: session.user.id,
        vocabularyId,
        status: status || 'learning',
        isFavorite: isFavorite ?? false,
        isLearned: isLearned ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userVocabulary.userId, userVocabulary.vocabularyId],
        set: {
          ...(status !== undefined && { status }),
          ...(isFavorite !== undefined && { isFavorite }),
          ...(isLearned !== undefined && { isLearned }),
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, userVocabulary: result }, { status: 201 });
  } catch (error) {
    console.error('Create user vocabulary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}