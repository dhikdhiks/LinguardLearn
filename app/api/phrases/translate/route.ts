import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withRateLimit, getIpIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { getCachedJson, setCachedJson } from '@/lib/dictionary';

function getCacheKey(phrase: string): string {
  return `tr:${phrase.trim().toLowerCase()}`;
}

/**
 * MyMemory kadang mengembalikan teks hasil terjemahan yang "doppel" di awal
 * (mis. "Apa Apa kabar?" atau "depan depan"). Rapikan semua kata berulang
 * yang berurutan agar hasilnya wajar, tanpa menyentuh frasa yang memang valid.
 */
function cleanTranslation(raw: string): string {
  if (!raw) return '';
  let text = String(raw).trim();
  // Hilangkan karakter ganda tak wajar
  text = text.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1');
  // Rapikan kata berulang berurutan: "apa apa kabar" -> "apa kabar"
  text = text.replace(/\b(\p{L}+)(?:\s+\1\b)+/giu, '$1');
  return text.trim();
}

function extractFromMyMemory(data: any): string {
  const translated = data?.responseData?.translatedText;
  if (typeof translated === 'string' && /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) {
    return '';
  }

  // Pilih match terbaik dari daftar matches (kualitas tertinggi & bukan echo sumber).
  const matches: any[] = Array.isArray(data?.matches) ? data.matches : [];
  let best = '';
  let bestQuality = -1;
  for (const m of matches) {
    const quality = Number(m.quality ?? 0);
    const text = typeof m.translation === 'string' ? m.translation.trim() : '';
    if (!text) continue;
    if (m.segment && text.toLowerCase() === String(m.segment).toLowerCase()) continue; // echo asing
    if (quality > bestQuality) {
      bestQuality = quality;
      best = text;
    }
  }

  return cleanTranslation(best || translated || '');
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const phrase = searchParams.get('phrase')?.trim();

  if (!phrase) {
    return NextResponse.json({ error: 'Phrase is required' }, { status: 400 });
  }

  // Apply rate limiting
  const rateLimitedHandler = withRateLimit(RATE_LIMIT_CONFIGS.phraseTranslate, getIpIdentifier);

  return rateLimitedHandler(request, async (req) => {
    try {
      // 1. Cek cache (disimpan per user yang valid agar tidak melanggar FK)
      const cacheKey = getCacheKey(phrase);
      const cached = await getCachedJson<{ translation: string }>(cacheKey);
      if (cached?.translation) {
        return NextResponse.json({
          phrase,
          translation: cached.translation,
          phonetic: '',
          cached: true,
        });
      }

      // 2. Terjemahan menggunakan MyMemory
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let translateData: any = null;
      try {
        const translateRes = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=en|id`,
          { signal: controller.signal }
        );
        translateData = await translateRes.json();
      } finally {
        clearTimeout(timeout);
      }

      const translation = extractFromMyMemory(translateData);

      // 3. Cache hasil (hanya jika berhasil)
      if (translation) {
        await setCachedJson(cacheKey, { translation }, userId, 'phrase-translate');
      }

      return NextResponse.json({
        phrase,
        translation,
        phonetic: '', // kosong, user bisa isi manual
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('Translate timeout:', phrase);
        return NextResponse.json({ error: 'Waktu minta habis, coba lagi.' }, { status: 504 });
      }
      console.error('Translate error:', error);
      return NextResponse.json({ error: 'Gagal menerjemahkan' }, { status: 500 });
    }
  });
}