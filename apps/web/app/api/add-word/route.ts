import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary } from 'db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();

  const word = formData.get('word') as string;
  const translation = formData.get('translation') as string;
  const definition = formData.get('definition') as string;
  const partOfSpeech = formData.get('partOfSpeech') as string;
  const difficulty = formData.get('difficulty') as string;
  const exampleSentence = formData.get('exampleSentence') as string;
  const phonetic = formData.get('phonetic') as string;
  const v1 = formData.get('v1') as string;
  const v2 = formData.get('v2') as string;
  const v3 = formData.get('v3') as string;
  const v_ing = formData.get('v_ing') as string;
  const v_s = formData.get('v_s') as string;
  const plural_form = formData.get('plural_form') as string;
  const synonymsRaw = formData.get('synonyms') as string;
  const antonymsRaw = formData.get('antonyms') as string;
  const tagsRaw = formData.get('tags') as string; // <-- TAMBAHKAN
  const notes = formData.get('notes') as string;

  if (!word || !translation || !partOfSpeech) {
    return NextResponse.json({ error: 'Word, translation, and part of speech are required' }, { status: 400 });
  }

  const existing = await db.select().from(vocabulary).where(eq(vocabulary.word, word)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: `Kata "${word}" sudah ada di kamus!` }, { status: 400 });
  }

  const synonyms = synonymsRaw ? synonymsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const antonyms = antonymsRaw ? antonymsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const tags = tagsRaw ? JSON.parse(tagsRaw) : [];

  await db.insert(vocabulary).values({
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
    synonyms,
    antonyms,
    tags,
    notes: notes || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isFavorite: false,
    isLearned: false,
  });

  return NextResponse.json({ success: true, word });
}