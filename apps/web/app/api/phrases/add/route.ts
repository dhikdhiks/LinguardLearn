import { NextRequest, NextResponse } from 'next/server';
import { db, phrases } from 'db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { phrase, translation, phonetic, category, notes } = body;

  if (!phrase || !translation) {
    return NextResponse.json({ error: 'Phrase and translation are required' }, { status: 400 });
  }

  // Check duplicate
  const existing = await db.select().from(phrases).where(db.eq(phrases.phrase, phrase)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: `Phrase "${phrase}" already exists` }, { status: 400 });
  }

  await db.insert(phrases).values({
    phrase,
    translation,
    phonetic: phonetic || null,
    category: category || 'general',
    notes: notes || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json({ success: true, phrase });
}