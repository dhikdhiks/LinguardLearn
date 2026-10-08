import { NextRequest, NextResponse } from 'next/server';
import { db, phrases } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getPhraseWithFlags, setPhraseFlags } from '@/lib/user-progress';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const result = await getPhraseWithFlags(session.user.id, id);

  if (!result) {
    return NextResponse.json({ error: 'Phrase not found' }, { status: 404 });
  }

  return NextResponse.json(result);
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

  // Data global phrases
  await db
    .update(phrases)
    .set({
      phrase,
      translation,
      phonetic: phonetic || null,
      difficulty: difficulty || 'beginner',
      tags: tags || [],
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(phrases.id, id));

  // Flag per-user (jika dikirim dari form edit)
  if (isFavorite !== undefined || isLearned !== undefined) {
    await setPhraseFlags(session.user.id, id, { isFavorite, isLearned });
  }

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

  // Flag per-user → simpan ke user_phrases
  if (body.isFavorite !== undefined || body.isLearned !== undefined) {
    await setPhraseFlags(session.user.id, id, {
      isFavorite: body.isFavorite,
      isLearned: body.isLearned,
    });
  }

  // Tags tetap data global frasa
  if (body.tags !== undefined) {
    await db
      .update(phrases)
      .set({ tags: body.tags, updatedAt: new Date() })
      .where(eq(phrases.id, id));
  }

  return NextResponse.json({ success: true });
}