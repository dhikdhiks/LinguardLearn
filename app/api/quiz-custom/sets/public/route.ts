import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomSets, users, quizCustomAttempts } from '@/lib/db';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Ambil kuis publik + nama pembuat + jumlah dimainkan
  const results = await db
    .select({
      set: quizCustomSets,
      creatorName: users.name,
      playedCount: sql<number>`count(${quizCustomAttempts.id})`.mapWith(Number),
    })
    .from(quizCustomSets)
    .leftJoin(users, eq(users.id, quizCustomSets.userId))
    .leftJoin(quizCustomAttempts, eq(quizCustomAttempts.setId, quizCustomSets.id))
    .where(eq(quizCustomSets.isPublic, true))
    .groupBy(quizCustomSets.id, users.name)
    .orderBy(desc(quizCustomSets.createdAt))
    .limit(limit)
    .offset(offset);

  const publicQuizzes = results.map((r) => ({
    id: r.set.id,
    name: r.set.name,
    description: r.set.description,
    contentType: r.set.contentType,
    direction: r.set.direction,
    questionType: r.set.questionType,
    questionsPerSession: r.set.questionsPerSession,
    shuffleQuestions: r.set.shuffleQuestions,
    shuffleOptions: r.set.shuffleOptions,
    isPublic: r.set.isPublic,
    createdAt: r.set.createdAt,
    updatedAt: r.set.updatedAt,
    creatorName: r.creatorName || 'Pengguna',
    playedCount: Number(r.playedCount),
  }));

  const total = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(quizCustomSets)
    .where(eq(quizCustomSets.isPublic, true));

  return NextResponse.json({
    data: publicQuizzes,
    total: Number(total[0]?.count ?? 0),
    limit,
    offset,
    hasMore: offset + limit < Number(total[0]?.count ?? 0),
  });
}
