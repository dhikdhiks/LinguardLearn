import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary, eq } from 'db';
import { auth } from '@/lib/auth';

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
  for (const item of data) {
    const { word, translation } = item;
    if (!word || !translation) continue;

    const existing = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.word, word))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(vocabulary).values({
        word,
        translation,
        definition: '',
        partOfSpeech: 'noun',
        difficulty: 'beginner',
        exampleSentence: '',
        phonetic: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      imported++;
    }
  }

  return NextResponse.json({ success: true, imported });
}