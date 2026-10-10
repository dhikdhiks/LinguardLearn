import { NextRequest, NextResponse } from 'next/server';
import { db, userPhrases, phrases } from '@/lib/db';
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

  const conditions = [eq(userPhrases.userId, session.user.id)];

  if (status !== 'all') {
    conditions.push(eq(userPhrases.status, status));
  }

  if (favorite) {
    conditions.push(eq(userPhrases.isFavorite, true));
  }

  const whereClause = and(...conditions);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: userPhrases.id,
        phraseId: userPhrases.phraseId,
        status: userPhrases.status,
        isFavorite: userPhrases.isFavorite,
        isLearned: userPhrases.isLearned,
        correctCount: userPhrases.correctCount,
        wrongCount: userPhrases.wrongCount,
        lastReviewedAt: userPhrases.lastReviewedAt,
        nextReviewAt: userPhrases.nextReviewAt,
        easeFactor: userPhrases.easeFactor,
        interval: userPhrases.interval,
        repetition: userPhrases.repetition,
        createdAt: userPhrases.createdAt,
        updatedAt: userPhrases.updatedAt,
        // Phrase details
        phrase: phrases.phrase,
        translation: phrases.translation,
        phonetic: phrases.phonetic,
        difficulty: phrases.difficulty,
      })
      .from(userPhrases)
      .innerJoin(phrases, eq(phrases.id, userPhrases.phraseId))
      .where(whereClause)
      .orderBy(desc(userPhrases.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(userPhrases)
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
    const { phraseId, status, isFavorite, isLearned } = body;

    if (!phraseId) {
      return NextResponse.json({ error: 'phraseId is required' }, { status: 400 });
    }

    // Check if phrase exists
    const phrase = await db.select().from(phrases).where(eq(phrases.id, phraseId)).limit(1);
    if (phrase.length === 0) {
      return NextResponse.json({ error: 'Phrase not found' }, { status: 404 });
    }

    // Upsert user phrase progress
    const [result] = await db
      .insert(userPhrases)
      .values({
        userId: session.user.id,
        phraseId,
        status: status || 'learning',
        isFavorite: isFavorite ?? false,
        isLearned: isLearned ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userPhrases.userId, userPhrases.phraseId],
        set: {
          ...(status !== undefined && { status }),
          ...(isFavorite !== undefined && { isFavorite }),
          ...(isLearned !== undefined && { isLearned }),
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, userPhrase: result }, { status: 201 });
  } catch (error) {
    console.error('Create user phrase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}