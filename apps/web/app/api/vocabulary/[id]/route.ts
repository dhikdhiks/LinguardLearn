import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary } from 'db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// ============================================================
// GET /api/vocabulary/[id] - Ambil detail kata
// ============================================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params; // <-- AWAIT params

  const word = await db
    .select()
    .from(vocabulary)
    .where(eq(vocabulary.id, id))
    .limit(1);

  if (word.length === 0) {
    return NextResponse.json({ error: 'Kata tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json(word[0]);
}

// ============================================================
// PUT /api/vocabulary/[id] - Update kata
// ============================================================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params; // <-- AWAIT params

  const body = await req.json();

  const {
    word,
    translation,
    definition,
    partOfSpeech,
    difficulty,
    exampleSentence,
    phonetic,
    v1,
    v2,
    v3,
    v_ing,
    v_s,
    plural_form,
    synonyms,
    antonyms,
    notes,
  } = body;

  if (!word || !translation || !partOfSpeech) {
    return NextResponse.json(
      { error: 'Word, translation, and part of speech are required' },
      { status: 400 }
    );
  }

  // Cek duplikat (jika mengubah word)
  const existing = await db
    .select()
    .from(vocabulary)
    .where(eq(vocabulary.word, word))
    .limit(1);

  if (existing.length > 0 && existing[0].id !== id) {
    return NextResponse.json(
      { error: `Kata "${word}" sudah ada di kamus!` },
      { status: 400 }
    );
  }

  await db
    .update(vocabulary)
    .set({
      word,
      translation,
      definition: definition || null,
      partOfSpeech: partOfSpeech as any,
      difficulty: (difficulty as any) || 'beginner',
      exampleSentence: exampleSentence || null,
      phonetic: phonetic || null,
      v1: v1 || null,
      v2: v2 || null,
      v3: v3 || null,
      v_ing: v_ing || null,
      v_s: v_s || null,
      plural_form: plural_form || null,
      synonyms: synonyms || [],
      antonyms: antonyms || [],
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(vocabulary.id, id));

  return NextResponse.json({ success: true });
}

// ============================================================
// PATCH /api/vocabulary/[id] - Toggle favorite / learned / tags
// ============================================================
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

  // Update hanya field yang dikirim
  await db
    .update(vocabulary)
    .set({
      ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
      ...(body.isLearned !== undefined && { isLearned: body.isLearned }),
      ...(body.tags !== undefined && { tags: body.tags }),
      updatedAt: new Date(),
    })
    .where(eq(vocabulary.id, id));

  return NextResponse.json({ success: true });
}

// ============================================================
// DELETE /api/vocabulary/[id] - Hapus kata
// ============================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params; // <-- AWAIT params

  await db.delete(vocabulary).where(eq(vocabulary.id, id));

  return NextResponse.json({ success: true });
}