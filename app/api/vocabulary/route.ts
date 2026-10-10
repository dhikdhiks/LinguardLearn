import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { difficultyEnum, partOfSpeechEnum } from '@/lib/db/schema';

// Valid values from schema
const VALID_DIFFICULTIES = difficultyEnum.enumValues;
const VALID_PARTS_OF_SPEECH = partOfSpeechEnum.enumValues;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // This is handled by vocabulary/route.ts - redirect or return same data
  return NextResponse.json({ message: 'Use GET /api/vocabulary for list' });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      word,
      translation,
      definition,
      partOfSpeech,
      difficulty,
      exampleSentence,
      phonetic,
      v1,
      v2,
      v3,
      v_ing,
      v_s,
      plural_form,
      synonyms,
      antonyms,
      tags,
      notes,
    } = body;

    // Validation
    if (!word || !translation || !partOfSpeech) {
      return NextResponse.json(
        { error: 'Word, translation, and part of speech are required' },
        { status: 400 }
      );
    }

    if (!VALID_PARTS_OF_SPEECH.includes(partOfSpeech)) {
      return NextResponse.json(
        { error: `Invalid part of speech. Must be one of: ${VALID_PARTS_OF_SPEECH.join(', ')}` },
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
      .from(vocabulary)
      .where(eq(vocabulary.word, word))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Kata "${word}" sudah ada di kamus!` },
        { status: 400 }
      );
    }

    // Insert new vocabulary
    const [newWord] = await db
      .insert(vocabulary)
      .values({
        word,
        translation,
        definition: definition || null,
        partOfSpeech,
        difficulty: difficulty || 'beginner',
        exampleSentence: exampleSentence || null,
        phonetic: phonetic || null,
        v1: v1 || null,
        v2: v2 || null,
        v3: v3 || null,
        v_ing: v_ing || null,
        v_s: v_s || null,
        plural_form: plural_form || null,
        synonyms: synonyms || [],
        antonyms: antonyms || [],
        tags: tags || [],
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, word: newWord }, { status: 201 });
  } catch (error) {
    console.error('Create vocabulary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}