import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fetchDictionaryEntry } from '@/lib/dictionary';

export const maxDuration = 60;

const CONCURRENCY = 6;
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

// ============================================
// IMPORT DARI DAFTAR KATA (satu kata per baris)
// Lookup kamus dijalankan PARALEL (concurrency limited),
// lalu disimpan sekaligus (bulk insert).
// ============================================
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawWords = Array.isArray(body?.words) ? body.words : null;
  if (!rawWords || rawWords.length === 0) {
    return NextResponse.json({ error: 'Daftar kata kosong' }, { status: 400 });
  }

  const words: string[] = Array.from(
    new Set(
      rawWords
        .map((w: unknown) => String(w).trim())
        .filter((w: string) => w.length > 0)
    )
  );

  const entries: Array<Record<string, unknown>> = [];
  const failed: string[] = [];
  let cursor = 0;

  // Worker pool dengan concurrency terbatas
  const worker = async () => {
    while (cursor < words.length) {
      const i = cursor++;
      const w = words[i];
      try {
        const e = await fetchDictionaryEntry(w);
        if (!e) {
          failed.push(`${w} (tidak ditemukan)`);
          continue;
        }
        if (!e.translation) {
          failed.push(`${w} (terjemahan tidak ditemukan)`);
          continue;
        }
        entries.push({
          word: e.word || w,
          translation: e.translation,
          definition: e.definition || null,
          partOfSpeech: POS.has(e.partOfSpeech) ? e.partOfSpeech : 'noun',
          difficulty: 'beginner',
          exampleSentence: e.exampleSentence || null,
          phonetic: e.phonetic || null,
          v1: e.v1 || null,
          v2: e.v2 || null,
          v3: e.v3 || null,
          v_ing: e.v_ing || null,
          v_s: e.v_s || null,
          plural_form: e.plural_form || null,
          synonyms: e.synonyms ?? [],
          antonyms: e.antonyms ?? [],
          tags: [],
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch {
        failed.push(`${w} (error)`);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, words.length) }, () => worker())
  );

  // Dedupe berdasarkan word (bisa sama setelah normalisasi API)
  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  for (const row of entries) {
    const key = String(row.word);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

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

  return NextResponse.json({
    success: true,
    imported,
    failed,
    total: words.length,
  });
}
