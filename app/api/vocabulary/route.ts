import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getVocabularyListWithFlags } from '@/lib/user-progress';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gunakan projection (kolom minimal) untuk list - lebih ringan
  const words = await getVocabularyListWithFlags(session.user.id);
  return NextResponse.json(words);
}