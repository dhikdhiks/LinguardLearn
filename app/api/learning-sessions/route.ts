import { NextRequest, NextResponse } from 'next/server';
import { db, learningSessions } from '@/lib/db';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const sessionType = searchParams.get('type') || ''; // vocabulary, phrases, quiz, review
  const days = parseInt(searchParams.get('days') || '30', 10); // filter by last N days

  const conditions = [eq(learningSessions.userId, session.user.id)];

  if (sessionType) {
    conditions.push(eq(learningSessions.sessionType, sessionType));
  }

  // Filter by date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  conditions.push(gte(learningSessions.startedAt, startDate));

  const whereClause = and(...conditions);

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(learningSessions)
      .where(whereClause)
      .orderBy(desc(learningSessions.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(learningSessions)
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
    const {
      sessionType,
      score,
      totalQuestions,
      correctAnswers,
      durationSeconds,
      startedAt,
      endedAt,
    } = body;

    if (!sessionType) {
      return NextResponse.json({ error: 'sessionType is required' }, { status: 400 });
    }

    const [newSession] = await db
      .insert(learningSessions)
      .values({
        userId: session.user.id,
        sessionType,
        score: score ?? null,
        totalQuestions: totalQuestions ?? null,
        correctAnswers: correctAnswers ?? null,
        durationSeconds: durationSeconds ?? null,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error) {
    console.error('Create learning session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}