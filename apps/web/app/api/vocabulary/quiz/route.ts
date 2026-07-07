import { NextResponse } from 'next/server';
import { db, vocabulary } from 'db';
import { auth } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const difficulties = searchParams.getAll('difficulties');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (difficulties.length === 0) {
    return NextResponse.json({ error: 'Pilih minimal satu tingkat kesulitan' }, { status: 400 });
  }

  const words = await db
    .select()
    .from(vocabulary)
    .where(
      sql`${vocabulary.difficulty} IN (${sql.join(difficulties.map(d => sql`${d}`), sql`, `)})`
    )
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  return NextResponse.json(words);
}