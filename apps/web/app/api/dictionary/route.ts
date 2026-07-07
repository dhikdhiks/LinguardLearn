import { NextResponse } from 'next/server';

// ============================================
// FREE DICTIONARY API (dengan parsing verb forms)
// ============================================
async function fetchFreeDictionary(word: string) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[0];

    const phonetic = entry.phonetics?.find((p: any) => p.text)?.text || '';

    const meanings = entry.meanings.map((m: any) => ({
      partOfSpeech: m.partOfSpeech || '',
      definition: m.definitions[0]?.definition || '',
      example: m.definitions[0]?.example || '',
      synonyms: m.definitions[0]?.synonyms || [],
      antonyms: m.definitions[0]?.antonyms || [],
    }));

    const first = meanings[0] || {};
    const allSynonyms = meanings.flatMap(m => m.synonyms);
    const allAntonyms = meanings.flatMap(m => m.antonyms);

    // === PARSE VERB FORMS ===
    let v1 = word;
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
      v1,
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

// ============================================
// MYMEMORY TRANSLATION
// ============================================
async function fetchTranslation(word: string) {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|id`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// MAIN API
// ============================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  try {
    const dictData = await fetchFreeDictionary(word);
    if (!dictData) {
      return NextResponse.json(
        { error: `Kata "${word}" tidak ditemukan` },
        { status: 404 }
      );
    }

    const translation = await fetchTranslation(word);

    const result = {
      ...dictData,
      translation: translation || '(Terjemahan tidak ditemukan, isi manual)',
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dictionary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}