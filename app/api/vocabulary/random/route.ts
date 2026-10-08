import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRandomUnlearnedWords } from '@/lib/user-progress';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Hanya kata yang BELUM dihafal user ini
  const result = await getRandomUnlearnedWords(session.user.id, limit);

  return NextResponse.json(result);
}