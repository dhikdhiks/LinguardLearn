import { NextRequest, NextResponse } from 'next/server';
import { db, phrases } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { difficultyEnum } from '@/lib/db/schema';
import { getPhrasesWithFlags } from '@/lib/user-progress';

// Valid values from schema
const VALID_DIFFICULTIES = difficultyEnum.enumValues;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // isFavorite/isLearned ikut SESSION user (per-user)
  const allPhrases = await getPhrasesWithFlags(session.user.id);
  return NextResponse.json(allPhrases);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      phrase,
      translation,
      phonetic,
      difficulty,
      tags,
      notes,
    } = body;

    // Validation
    if (!phrase || !translation) {
      return NextResponse.json(
        { error: 'Phrase and translation are required' },
        { status: 400 }
      );
    }

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await db
      .select()
      .from(phrases)
      .where(eq(phrases.phrase, phrase))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Frasa "${phrase}" sudah ada!` },
        { status: 400 }
      );
    }

    // Insert new phrase
    const [newPhrase] = await db
      .insert(phrases)
      .values({
        phrase,
        translation,
        phonetic: phonetic || null,
        difficulty: difficulty || 'beginner',
        tags: tags || [],
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, phrase: newPhrase }, { status: 201 });
  } catch (error) {
    console.error('Create phrase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}