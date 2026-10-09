import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomAttempts, quizCustomSets } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get('setId');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const conditions = [eq(quizCustomAttempts.userId, session.user.id)];
  if (setId) conditions.push(eq(quizCustomAttempts.setId, setId));

  const [attempts, totalResult] = await Promise.all([
    db
      .select({
        attempt: quizCustomAttempts,
        setName: quizCustomSets.name,
      })
      .from(quizCustomAttempts)
      .leftJoin(quizCustomSets, eq(quizCustomAttempts.setId, quizCustomSets.id))
      .where(and(...conditions))
      .orderBy(desc(quizCustomAttempts.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(quizCustomAttempts)
      .where(and(...conditions)),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return NextResponse.json({
    data: attempts.map(a => ({
      ...a.attempt,
      setName: a.setName,
    })),
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  });
}