import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRandomUnlearnedPhrases } from '@/lib/user-progress';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Gunakan optimized random (ID-range, bukan ORDER BY RANDOM())
  const result = await getRandomUnlearnedPhrases(session.user.id, limit);

  return NextResponse.json(result);
}