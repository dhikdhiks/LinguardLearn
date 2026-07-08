import { NextRequest, NextResponse } from 'next/server';
import { db, phrases, eq } from 'db'; // <-- tambahkan eq
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  let imported = 0;
  for (const item of data) {
    const { phrase, translation, phonetic, difficulty, tags, notes } = item;
    if (!phrase || !translation) continue;

    const existing = await db
      .select()
      .from(phrases)
      .where(eq(phrases.phrase, phrase)) // <-- ganti db.eq dengan eq
      .limit(1);

    if (existing.length === 0) {
      await db.insert(phrases).values({
        phrase,
        translation,
        phonetic: phonetic || null,
        difficulty: difficulty || 'beginner',
        tags: tags || [],
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      imported++;
    }
  }

  return NextResponse.json({ success: true, imported });
}