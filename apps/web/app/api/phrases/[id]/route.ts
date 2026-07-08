import { NextRequest, NextResponse } from 'next/server';
import { db, phrases, eq } from 'db';
import { auth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const result = await db
    .select()
    .from(phrases)
    .where(eq(phrases.id, id))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: 'Phrase not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { phrase, translation, phonetic, difficulty, tags, notes, isFavorite, isLearned } = body;

  if (!phrase || !translation) {
    return NextResponse.json(
      { error: 'Phrase and translation are required' },
      { status: 400 }
    );
  }

  await db
    .update(phrases)
    .set({
      phrase,
      translation,
      phonetic: phonetic || null,
      difficulty: difficulty || 'beginner',
      tags: tags || [],
      notes: notes || null,
      isFavorite: isFavorite !== undefined ? isFavorite : false,
      isLearned: isLearned !== undefined ? isLearned : false,
      updatedAt: new Date(),
    })
    .where(eq(phrases.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(phrases).where(eq(phrases.id, id));
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  await db
    .update(phrases)
    .set({
      ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
      ...(body.isLearned !== undefined && { isLearned: body.isLearned }),
      ...(body.tags !== undefined && { tags: body.tags }),
      updatedAt: new Date(),
    })
    .where(eq(phrases.id, id));

  return NextResponse.json({ success: true });
}