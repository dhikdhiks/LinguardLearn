import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomSets, quizCustomSetItems } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [set] = await db
    .select()
    .from(quizCustomSets)
    .where(and(eq(quizCustomSets.id, id), eq(quizCustomSets.userId, session.user.id)))
    .limit(1);

  if (!set) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  // Ambil items
  const items = await db
    .select()
    .from(quizCustomSetItems)
    .where(eq(quizCustomSetItems.setId, id))
    .orderBy(quizCustomSetItems.sortOrder);

  return NextResponse.json({ ...set, items });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Cek ownership
  const [existing] = await db
    .select()
    .from(quizCustomSets)
    .where(and(eq(quizCustomSets.id, id), eq(quizCustomSets.userId, session.user.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      contentType,
      direction,
      questionType,
      questionsPerSession,
      shuffleQuestions,
      shuffleOptions,
      isPublic,
    } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (contentType !== undefined) updateData.contentType = contentType;
    if (direction !== undefined) updateData.direction = direction;
    if (questionType !== undefined) updateData.questionType = questionType;
    if (questionsPerSession !== undefined) updateData.questionsPerSession = questionsPerSession;
    if (shuffleQuestions !== undefined) updateData.shuffleQuestions = shuffleQuestions;
    if (shuffleOptions !== undefined) updateData.shuffleOptions = shuffleOptions;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const [updated] = await db
      .update(quizCustomSets)
      .set(updateData)
      .where(eq(quizCustomSets.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update quiz set error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate kuis' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Cek ownership
  const [existing] = await db
    .select()
    .from(quizCustomSets)
    .where(and(eq(quizCustomSets.id, id), eq(quizCustomSets.userId, session.user.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  await db.delete(quizCustomSets).where(eq(quizCustomSets.id, id));

  return NextResponse.json({ success: true });
}