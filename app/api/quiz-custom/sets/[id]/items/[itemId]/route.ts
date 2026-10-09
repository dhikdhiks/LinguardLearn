import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomSets, quizCustomSetItems } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, itemId } = await params;

  // Cek ownership
  const [set] = await db
    .select()
    .from(quizCustomSets)
    .where(and(eq(quizCustomSets.id, id), eq(quizCustomSets.userId, session.user.id)))
    .limit(1);

  if (!set) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  await db
    .delete(quizCustomSetItems)
    .where(and(eq(quizCustomSetItems.setId, id), eq(quizCustomSetItems.id, itemId)));

  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, itemId } = await params;

  // Cek ownership
  const [set] = await db
    .select()
    .from(quizCustomSets)
    .where(and(eq(quizCustomSets.id, id), eq(quizCustomSets.userId, session.user.id)))
    .limit(1);

  if (!set) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { sortOrder, customQuestion, customAnswer } = body;

    const updateData: Record<string, unknown> = {};
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (customQuestion !== undefined) updateData.customQuestion = customQuestion?.trim() || null;
    if (customAnswer !== undefined) updateData.customAnswer = customAnswer?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diupdate' }, { status: 400 });
    }

    const [updated] = await db
      .update(quizCustomSetItems)
      .set(updateData)
      .where(and(eq(quizCustomSetItems.setId, id), eq(quizCustomSetItems.id, itemId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update quiz item error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate item' }, { status: 500 });
  }
}