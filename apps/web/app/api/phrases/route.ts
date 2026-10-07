import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPhrasesWithFlags } from '@/lib/user-progress';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // isFavorite/isLearned ikut SESSION user (per-user)
  const allPhrases = await getPhrasesWithFlags(session.user.id);
  return NextResponse.json(allPhrases);
}