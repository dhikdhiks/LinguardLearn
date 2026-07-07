import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary } from 'db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  let imported = 0;
  for (const word of data) {
    const { word: w, translation, definition, partOfSpeech, difficulty, exampleSentence, phonetic, v1, v2, v3, v_ing, v_s, plural_form, synonyms, antonyms, notes } = word;

    // Cek duplikat
    const existing = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.word, w))
      .limit(1);

    if (existing.length === 0 && w && translation) {
      await db.insert(vocabulary).values({
        word: w,
        translation,
        definition: definition || null,
        partOfSpeech: partOfSpeech || null,
        difficulty: difficulty || 'beginner',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      imported++;
    }
  }

  return NextResponse.json({ success: true, imported });
}