import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary } from '@/lib/db';
import { auth } from '@/lib/auth';

const CHUNK_SIZE = 500;
const POS = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
]);
const DIFF = new Set(['beginner', 'intermediate', 'advanced']);

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: any;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Normalisasi + dedupe di memori
  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (const item of data) {
    const word = str(item?.word);
    const translation = str(item?.translation);
    if (!word || !translation) {
      skipped++;
      continue;
    }
    if (seen.has(word)) {
      skipped++;
      continue;
    }
    seen.add(word);

    rows.push({
      word,
      translation,
      definition: str(item?.definition) || null,
      partOfSpeech: POS.has(item?.partOfSpeech) ? item.partOfSpeech : 'noun',
      difficulty: DIFF.has(item?.difficulty) ? item.difficulty : 'beginner',
      exampleSentence: str(item?.exampleSentence) || null,
      phonetic: str(item?.phonetic) || null,
      v1: str(item?.v1) || null,
      v2: str(item?.v2) || null,
      v3: str(item?.v3) || null,
      v_ing: str(item?.v_ing) || null,
      v_s: str(item?.v_s) || null,
      plural_form: str(item?.plural_form) || null,
      synonyms: Array.isArray(item?.synonyms) ? item.synonyms : [],
      antonyms: Array.isArray(item?.antonyms) ? item.antonyms : [],
      tags: Array.isArray(item?.tags) ? item.tags : [],
      notes: str(item?.notes) || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Bulk insert per chunk (bukan per baris!)
  let imported = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const inserted = await db
      .insert(vocabulary)
      .values(chunk as any)
      .onConflictDoNothing({ target: vocabulary.word })
      .returning({ id: vocabulary.id });
    imported += inserted.length;
  }

  return NextResponse.json({ success: true, imported, skipped });
}
