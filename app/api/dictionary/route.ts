import { NextResponse } from 'next/server';
import { fetchDictionaryEntry } from '@/lib/dictionary';

// ============================================
// DICTIONARY API (dictionary + terjemahan paralel)
// ============================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  try {
    const result = await fetchDictionaryEntry(word);
    if (!result) {
      return NextResponse.json({ error: `Kata "${word}" tidak ditemukan` }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Dictionary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
