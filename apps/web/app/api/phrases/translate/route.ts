import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phrase = searchParams.get('phrase');

  if (!phrase) {
    return NextResponse.json({ error: 'Phrase is required' }, { status: 400 });
  }

  try {
    // 1. Terjemahan menggunakan MyMemory
    const translateRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=en|id`
    );
    const translateData = await translateRes.json();
    const translation = translateData.responseData?.translatedText || '';

    // 2. Phonetic: tidak ada API gratis untuk phonetic kalimat.
    // Kita hanya kirim translation, phonetic dikosongkan.

    return NextResponse.json({
      phrase,
      translation,
      phonetic: '', // kosong, user bisa isi manual
    });
  } catch (error) {
    console.error('Translate error:', error);
    return NextResponse.json({ error: 'Gagal menerjemahkan' }, { status: 500 });
  }
}