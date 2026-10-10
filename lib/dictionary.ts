// ============================================
// SHARED DICTIONARY HELPER
// Sumber berlapis:
//   1. dictionaryapi.dev (paling lengkap: fonetik + bentuk kata)
//   2. Wiktionary REST (cadangan: definisi + jenis kata)
//   3. MyMemory (terjemahan, jalan paralel)
// Kegagalan satu sumber tidak mematikan seluruh hasil.
// Cache layer menggunakan ai_interactions table (TTL 7 hari)
// ============================================

import { db, aiInteractions } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';

export interface DictBase {
  word: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string;
  phonetic: string;
  synonyms: string[];
  antonyms: string[];
  v1: string;
  v2: string;
  v3: string;
  v_ing: string;
  v_s: string;
  plural_form: string;
}

export interface DictionaryEntry extends DictBase {
  translation: string;
  /** true jika data tidak lengkap (mis. definisi/bentuk kata tidak tersedia) */
  partial?: boolean;
  /** true jika terjemahan tidak ditemukan */
  translationMissing?: boolean;
}

// Cache TTL: 7 days in milliseconds
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ---------- UTIL ----------
function stripHtml(input: string): string {
  return String(input ?? '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapPartOfSpeech(raw: string): string {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('noun')) return 'noun';
  if (s.includes('adjective')) return 'adjective';
  if (s.includes('adverb')) return 'adverb'; // dicek sebelum "verb" ("adverb" mengandung "verb")
  if (s.includes('verb')) return 'verb';
  if (s.includes('pronoun')) return 'pronoun';
  if (s.includes('preposition')) return 'preposition';
  if (s.includes('conjunction')) return 'conjunction';
  if (s.includes('interjection')) return 'interjection';
  return '';
}

// Retry sederhana: coba beberapa kali sampai dapat hasil
async function withRetry<T>(fn: () => Promise<T | null>, attempts = 2): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    const result = await fn();
    if (result) return result;
  }
  return null;
}

// Generate cache key for dictionary lookup
function getCacheKey(word: string): string {
  return `dict:${word.toLowerCase().trim()}`;
}

// Check cache in ai_interactions table
async function getCachedEntry(word: string): Promise<DictionaryEntry | null> {
  try {
    const cacheKey = getCacheKey(word);
    const rows = await db
      .select()
      .from(aiInteractions)
      .where(
        and(
          eq(aiInteractions.prompt, cacheKey),
          sql`${aiInteractions.createdAt} > NOW() - INTERVAL '7 days'`
        )
      )
      .orderBy(sql`${aiInteractions.createdAt} DESC`)
      .limit(1);

    if (rows.length > 0) {
      const cached = JSON.parse(rows[0].response);
      // Mark as cache hit for analytics
      await db
        .update(aiInteractions)
        .set({ cacheHit: true })
        .where(eq(aiInteractions.id, rows[0].id));
      return cached;
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

// Store entry in cache
async function setCachedEntry(word: string, entry: DictionaryEntry): Promise<void> {
  try {
    const cacheKey = getCacheKey(word);
    // Use a system user ID for cache entries (or first admin user)
    const systemUserId = 'system-cache';
    
    await db.insert(aiInteractions).values({
      userId: systemUserId,
      prompt: cacheKey,
      response: JSON.stringify(entry),
      modelUsed: 'dictionary-cache',
      tokensUsed: 0,
      cacheHit: false,
    });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// ---------- SUMBER 1: dictionaryapi.dev ----------
async function fetchFreeDictionary(word: string): Promise<DictBase | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[0];
    if (!entry) return null;

    const phonetic = entry.phonetics?.find((p: any) => p.text)?.text || '';

    const meanings = (entry.meanings ?? []).map((m: any) => ({
      partOfSpeech: m.partOfSpeech || '',
      definition: m.definitions?.[0]?.definition || '',
      example: m.definitions?.[0]?.example || '',
      synonyms: m.definitions?.[0]?.synonyms || [],
      antonyms: m.definitions?.[0]?.antonyms || [],
    }));

    const first = meanings[0] || {};

    const allSynonyms: string[] = meanings.flatMap((m: any) => m.synonyms ?? []);
    const allAntonyms: string[] = meanings.flatMap((m: any) => m.antonyms ?? []);

    // === PARSE VERB FORMS ===
    let v2 = '';
    let v3 = '';
    let v_ing = '';
    let v_s = '';

    if (entry.forms && Array.isArray(entry.forms)) {
      for (const form of entry.forms) {
        const type = form.type || '';
        const text = form.text || '';
        if (!text) continue;

        if (type.includes('past') && !type.includes('participle')) v2 = text;
        else if (type.includes('past participle')) v3 = text;
        else if (type.includes('present participle') || type.includes('ing')) v_ing = text;
        else if (type.includes('third person') || type.includes('3rd') || type.includes('s')) v_s = text;
      }
    }

    // Fallback jika tidak ada forms
    if (entry.inflection && Array.isArray(entry.inflection)) {
      for (const inf of entry.inflection) {
        const type = inf.type || '';
        const text = inf.text || '';
        if (type.includes('past tense')) v2 = text;
        if (type.includes('past participle')) v3 = text;
        if (type.includes('present participle')) v_ing = text;
        if (type.includes('third person')) v_s = text;
      }
    }

    return {
      word: entry.word || word,
      partOfSpeech: first.partOfSpeech || '',
      definition: first.definition || '',
      exampleSentence: first.example || '',
      phonetic: phonetic || '',
      synonyms: [...new Set(allSynonyms)],
      antonyms: [...new Set(allAntonyms)],
      v1: entry.word || word,
      v2,
      v3,
      v_ing,
      v_s,
      plural_form: '',
    };
  } catch (error) {
    console.error('Free Dictionary API error:', error);
    return null;
  }
}

// ---------- SUMBER 2: Wiktionary ----------
async function fetchWiktionary(word: string): Promise<DictBase | null> {
  try {
    const res = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const en = data?.en;
    if (!Array.isArray(en) || en.length === 0) return null;

    const first = en.find((e: any) => e.language === 'English') ?? en[0];
    const def = first.definitions?.[0];
    if (!def) return null;

    const example =
      def.examples?.[0] || def.parsedExamples?.[0]?.example || '';

    return {
      word,
      partOfSpeech: mapPartOfSpeech(first.partOfSpeech),
      definition: stripHtml(def.definition || ''),
      exampleSentence: stripHtml(example),
      phonetic: '',
      synonyms: [],
      antonyms: [],
      v1: word,
      v2: '',
      v3: '',
      v_ing: '',
      v_s: '',
      plural_form: '',
    };
  } catch (error) {
    console.error('Wiktionary API error:', error);
    return null;
  }
}

// ---------- SUMBER 3: MyMemory (terjemahan) ----------
async function fetchTranslation(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|id`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (typeof translated === 'string' && translated.trim()) {
      // MyMemory kadang mengembalikan pesan error sebagai teks
      if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) return null;
      return translated.trim();
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// GABUNGAN: dictionary + wiktionary + terjemahan (semua paralel)
// Dengan caching via ai_interactions table
// ============================================
export async function fetchDictionaryEntry(word: string): Promise<DictionaryEntry | null> {
  // 1. Check cache first
  const cached = await getCachedEntry(word);
  if (cached) {
    return { ...cached, partial: false }; // cached entries are complete
  }

  // 2. Fetch from external APIs
  const [dict, wik, translation] = await Promise.all([
    fetchFreeDictionary(word),
    withRetry(() => fetchWiktionary(word), 2),
    withRetry(() => fetchTranslation(word), 2),
  ]);

  const base = dict ?? wik; // dictionaryapi.dev lebih lengkap, pakai dulu

  // Tidak ada sumber kamus sama sekali
  if (!base) {
    if (translation) {
      const entry: DictionaryEntry = {
        word,
        translation,
        partOfSpeech: '',
        definition: '',
        exampleSentence: '',
        phonetic: '',
        synonyms: [],
        antonyms: [],
        v1: word,
        v2: '',
        v3: '',
        v_ing: '',
        v_s: '',
        plural_form: '',
        partial: true,
      };
      await setCachedEntry(word, entry);
      return entry;
    }
    return null;
  }

  const entry: DictionaryEntry = {
    ...base,
    translation: translation || '',
    partial: !dict, // hanya Wiktionary → fonetik/bentuk kata kemungkinan kosong
    translationMissing: !translation,
  };

  // 3. Cache the result
  await setCachedEntry(word, entry);

  return entry;
}