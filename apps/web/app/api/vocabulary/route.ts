import { NextResponse } from 'next/server';
import { db, vocabulary, eq } from 'db';
import { auth } from '@/lib/auth';
import { getVocabularyWithFlags, setVocabularyFlags } from '@/lib/user-progress';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // isFavorite/isLearned ikut SESSION user (per-user)
  const words = await getVocabularyWithFlags(session.user.id);
  return NextResponse.json(words);
}