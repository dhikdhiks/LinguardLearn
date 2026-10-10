import { NextRequest, NextResponse } from 'next/server';
import { db, vocabulary, userVocabulary } from '@/lib/db';
import { eq, inArray, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { difficultyEnum, partOfSpeechEnum } from '@/lib/db/schema';

const VALID_DIFFICULTIES = difficultyEnum.enumValues;
const VALID_PARTS_OF_SPEECH = partOfSpeechEnum.enumValues;

// POST /api/vocabulary/bulk - Bulk create vocabulary
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin only for bulk operations on global vocabulary
  if (session.user.email !== 'admin@linguardlearn.com') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { words } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'words array is required' }, { status: 400 });
    }

    if (words.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 words per bulk request' }, { status: 400 });
    }

    const results = {
      created: [] as any[],
      skipped: [] as any[],
      errors: [] as any[],
    };

    for (const wordData of words) {
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
      } = wordData;

      // Validation
      if (!word || !translation || !partOfSpeech) {
        results.errors.push({ word: word || 'unknown', error: 'Missing required fields' });
        continue;
      }

      if (!VALID_PARTS_OF_SPEECH.includes(partOfSpeech)) {
        results.errors.push({ word, error: 'Invalid partOfSpeech' });
        continue;
      }

      if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
        results.errors.push({ word, error: 'Invalid difficulty' });
        continue;
      }

      // Check duplicate
      const existing = await db
        .select()
        .from(vocabulary)
        .where(eq(vocabulary.word, word))
        .limit(1);

      if (existing.length > 0) {
        results.skipped.push({ word, reason: 'already exists' });
        continue;
      }

      // Insert
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

      results.created.push(newWord);
    }

    return NextResponse.json({
      success: true,
      summary: {
        created: results.created.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
      details: results,
    });
  } catch (error) {
    console.error('Bulk create vocabulary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/vocabulary/bulk - Bulk delete vocabulary (admin only)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin only for bulk operations on global vocabulary
  if (session.user.email !== 'admin@linguardlearn.com') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids parameter required (comma-separated)' }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 IDs per bulk request' }, { status: 400 });
    }

    await db.delete(vocabulary).where(inArray(vocabulary.id, ids));

    // Also delete related user progress
    await db.delete(userVocabulary).where(inArray(userVocabulary.vocabularyId, ids));

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    console.error('Bulk delete vocabulary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/vocabulary/bulk - Bulk update user progress (favorite/learned)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { vocabularyIds, isFavorite, isLearned } = body;

    if (!Array.isArray(vocabularyIds) || vocabularyIds.length === 0) {
      return NextResponse.json({ error: 'vocabularyIds array is required' }, { status: 400 });
    }

    if (vocabularyIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 IDs per bulk request' }, { status: 400 });
    }

    // Verify all vocabulary exist
    const existing = await db
      .select({ id: vocabulary.id })
      .from(vocabulary)
      .where(inArray(vocabulary.id, vocabularyIds));

    const validIds = existing.map(v => v.id);
    const invalidIds = vocabularyIds.filter(id => !validIds.includes(id));

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid vocabulary IDs provided' }, { status: 400 });
    }

    // Bulk upsert user progress
    const updates = validIds.map(vocabId => ({
      userId,
      vocabularyId: vocabId,
      ...(isFavorite !== undefined && { isFavorite }),
      ...(isLearned !== undefined && { isLearned }),
      updatedAt: new Date(),
    }));

    await db
      .insert(userVocabulary)
      .values(updates)
      .onConflictDoUpdate({
        target: [userVocabulary.userId, userVocabulary.vocabularyId],
        set: {
          ...(isFavorite !== undefined && { isFavorite }),
          ...(isLearned !== undefined && { isLearned }),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      updatedCount: validIds.length,
      invalidIds,
    });
  } catch (error) {
    console.error('Bulk update vocabulary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}