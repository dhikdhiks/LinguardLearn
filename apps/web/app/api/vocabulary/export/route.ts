import { NextResponse } from 'next/server';
import { db, vocabulary } from 'db';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const words = await db.select().from(vocabulary).orderBy(vocabulary.word);
  return NextResponse.json(words);
}