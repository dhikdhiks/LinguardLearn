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

  const randomPhrases = await db
    .select()
    .from(phrases)
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  return NextResponse.json(randomPhrases);
}