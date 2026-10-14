import { NextResponse } from 'next/server';
import { fetchDictionaryEntry } from '@/lib/dictionary';
import { auth } from '@/lib/auth';
import { withRateLimit, getIpIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

// ============================================
// DICTIONARY API (dictionary + terjemahan paralel)
// ============================================
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word')?.trim();

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  // Apply rate limiting
  const rateLimitedHandler = withRateLimit(RATE_LIMIT_CONFIGS.dictionary, getIpIdentifier);

  return rateLimitedHandler(request, async (req) => {
    try {
      // userId dipakai agar hasil bisa di-cache (kolom user_id punya FK ke users).
      const result = await fetchDictionaryEntry(word, userId);
      if (!result) {
        return NextResponse.json({ error: `Word "${word}" not found` }, { status: 404 });
      }
      return NextResponse.json(result);
    } catch (error) {
      console.error('Dictionary API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
