import { NextResponse } from 'next/server';
import { db, phrases } from 'db';
import { auth } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const difficulty = searchParams.get('difficulty') || null;

let query = db.select().from(phrases);

const result = difficulty
  ? await query
      .where(sql`${phrases.difficulty} = ${difficulty}`)
      .orderBy(sql`RANDOM()`)
      .limit(limit)
  : await query
      .orderBy(sql`RANDOM()`)
      .limit(limit);

return NextResponse.json(result);
}