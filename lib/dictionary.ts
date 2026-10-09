// ============================================
// SHARED DICTIONARY HELPER
// Dipakai oleh /api/dictionary dan batch import.
// Kedua API eksternal dijalankan PARALEL.
// ============================================

export interface DictionaryEntry {
  word: string;
  translation: string;
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

async function fetchFreeDictionary(word: string) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(8000) }
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

async function fetchTranslation(word: string) {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|id`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText as string;
    }
    return null;
  } catch {
    return null;
  }
}

// Ambil dictionary + terjemahan sekaligus (paralel)
export async function fetchDictionaryEntry(word: string): Promise<DictionaryEntry | null> {
  const [dictData, translation] = await Promise.all([
    fetchFreeDictionary(word),
    fetchTranslation(word),
  ]);

  if (!dictData) return null;

  return {
    ...dictData,
    translation: translation || '(Terjemahan tidak ditemukan, isi manual)',
  };
}
