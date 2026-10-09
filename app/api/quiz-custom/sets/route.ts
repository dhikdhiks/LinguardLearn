import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomSets } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sets = await db
    .select()
    .from(quizCustomSets)
    .where(eq(quizCustomSets.userId, session.user.id))
    .orderBy(desc(quizCustomSets.createdAt));

  return NextResponse.json(sets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      contentType = 'vocabulary',
      direction = 'source_to_target',
      questionType = 'type_in',
      questionsPerSession = 0,
      shuffleQuestions = true,
      shuffleOptions = true,
      isPublic = false,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nama kuis wajib diisi' }, { status: 400 });
    }

    const [newSet] = await db
      .insert(quizCustomSets)
      .values({
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        contentType,
        direction,
        questionType,
        questionsPerSession,
        shuffleQuestions,
        shuffleOptions,
        isPublic,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newSet);
  } catch (error) {
    console.error('Create quiz set error:', error);
    return NextResponse.json({ error: 'Gagal membuat kuis' }, { status: 500 });
  }
}