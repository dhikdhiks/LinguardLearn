import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, vocabulary, quizCustomSets, quizCustomSetItems } from '@/lib/db';
import { eq, inArray, sql } from 'drizzle-orm';
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
// IMPORT SOAL QUIZ DARI KATA-KATA
// Menerima kata APA SAJA (semua part of speech).
// Mode:
//   - text     : daftar kata dari textarea (1 kata/baris).
//                Kata yang belum ada di kamus di-lookup ke
//                dictionary API.
//   - database : ambil kata dari kamus.
//                pos=verb (default) → hanya verb
//                pos=all            → semua kata
// Hasil: dibuatkan kuis baru berisi soal-soal tersebut.
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

  const mode = body?.mode === 'database' ? 'database' : 'text';
  const pos = body?.pos === 'all' ? 'all' : 'verb';
  const setName =
    typeof body?.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 200)
      : `Kuis Import ${new Date().toLocaleDateString('id-ID')}`;

  const itemIds: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  if (mode === 'database') {
    // Ambil kata dari kamus: semua verb saja, atau semua kata
    const rows = await db
      .select({ id: vocabulary.id })
      .from(vocabulary)
      .where(
        pos === 'all' ? undefined : eq(vocabulary.partOfSpeech, 'verb')
      );
    itemIds.push(...rows.map((r) => r.id));
  } else {
    const rawWords = Array.isArray(body?.words) ? body.words : null;
    if (!rawWords || rawWords.length === 0) {
      return NextResponse.json({ error: 'Daftar kata kosong' }, { status: 400 });
    }

    const words: string[] = Array.from(
      new Set<string>(
        rawWords
          .map((w: unknown) => String(w).trim().toLowerCase())
          .filter((w: string) => w.length > 0)
      )
    );

    const userId = session.user!.id;

    // 1. Cek kata yang SUDAH ada di kamus — langsung dipakai
    const existing = await db
      .select({
        id: vocabulary.id,
        word: vocabulary.word,
        partOfSpeech: vocabulary.partOfSpeech,
      })
      .from(vocabulary)
      .where(inArray(sql`lower(${vocabulary.word})`, words));

    const existingMap = new Map<string, (typeof existing)[number]>(
      existing.map((r) => [r.word.toLowerCase(), r] as [string, (typeof existing)[number]])
    );

    const toFetch: string[] = [];
    for (const w of words) {
      const row = existingMap.get(w);
      if (row) {
        itemIds.push(row.id);
      } else {
        toFetch.push(w);
      }
    }

    // 2. Lookup kamus untuk kata baru — semua jenis kata diterima
    const entries: Array<Record<string, unknown>> = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < toFetch.length) {
        const i = cursor++;
        const w = toFetch[i];
        try {
          const e = await fetchDictionaryEntry(w, userId);
          if (!e) {
            failed.push(`${w} (tidak ditemukan)`);
            continue;
          }
          if (!e.translation) {
            skipped.push(`${w} (terjemahan tidak ditemukan)`);
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

    if (toFetch.length > 0) {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, toFetch.length) }, () =>
          worker()
        )
      );
    }

    // 3. Insert kata baru (bulk + dedupe)
    const seen = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];
    for (const row of entries) {
      const key = String(row.word).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }

    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await db
          .insert(vocabulary)
          .values(chunk as any)
          .onConflictDoNothing({ target: vocabulary.word });
      }

      // Ambil id hasil insert (onConflictDoNothing tidak mengembalikan row yang sudah ada)
      const inserted = await db
        .select({ id: vocabulary.id, word: vocabulary.word })
        .from(vocabulary)
        .where(
          inArray(
            sql`lower(${vocabulary.word})`,
            rows.map((r) => String(r.word).toLowerCase())
          )
        );
      itemIds.push(...inserted.map((r) => r.id));
    }
  }

  if (itemIds.length === 0) {
    return NextResponse.json(
      {
        error: 'Tidak ada kata yang bisa diimport',
        imported: 0,
        skipped,
        failed,
      },
      { status: 400 }
    );
  }

  // Dedupe — jaga-jaga agar tidak melanggar unique index (setId, itemType, itemId)
  const uniqueItemIds = [...new Set(itemIds)];

  // 4. Buat kuis baru berisi soal-soal tersebut
  const [set] = await db
    .insert(quizCustomSets)
    .values({
      userId: session.user.id,
      name: setName,
      description: `Kuis kosakata — ${uniqueItemIds.length} soal, diimpor otomatis`,
      contentType: 'vocabulary',
      direction: 'source_to_target',
      questionType: 'type_in',
      questionsPerSession: 0,
      shuffleQuestions: true,
      shuffleOptions: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await db.insert(quizCustomSetItems).values(
    uniqueItemIds.map((itemId, i) => ({
      setId: set.id,
      itemType: 'vocabulary',
      itemId,
      customQuestion: null,
      customAnswer: null,
      sortOrder: i,
      createdAt: new Date(),
    }))
  );

  return NextResponse.json({
    success: true,
    setId: set.id,
    name: set.name,
    imported: uniqueItemIds.length,
    skipped,
    failed,
  });
}
