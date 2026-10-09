import { NextRequest, NextResponse } from 'next/server';
import { db, phrases } from '@/lib/db';
import { auth } from '@/lib/auth';

const CHUNK_SIZE = 500;
const DIFF = new Set(['beginner', 'intermediate', 'advanced']);

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: any;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Normalisasi + dedupe di memori
  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (const item of data) {
    const phrase = str(item?.phrase);
    const translation = str(item?.translation);
    if (!phrase || !translation) {
      skipped++;
      continue;
    }
    if (seen.has(phrase)) {
      skipped++;
      continue;
    }
    seen.add(phrase);

    rows.push({
      phrase,
      translation,
      phonetic: str(item?.phonetic) || null,
      difficulty: DIFF.has(item?.difficulty) ? item.difficulty : 'beginner',
      tags: Array.isArray(item?.tags) ? item.tags : [],
      notes: str(item?.notes) || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Bulk insert per chunk (bukan per baris!)
  let imported = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const inserted = await db
      .insert(phrases)
      .values(chunk as any)
      .onConflictDoNothing({ target: phrases.phrase })
      .returning({ id: phrases.id });
    imported += inserted.length;
  }

  return NextResponse.json({ success: true, imported, skipped });
}
