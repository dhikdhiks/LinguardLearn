import { NextRequest, NextResponse } from 'next/server';
import { db, phrases, userPhrases } from '@/lib/db';
import { eq, inArray, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { difficultyEnum } from '@/lib/db/schema';

const VALID_DIFFICULTIES = difficultyEnum.enumValues;

// POST /api/phrases/bulk - Bulk create phrases
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin only for bulk operations on global phrases
  if (session.user.email !== 'admin@linguardlearn.com') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { phrases: phrasesData } = body;

    if (!Array.isArray(phrasesData) || phrasesData.length === 0) {
      return NextResponse.json({ error: 'phrases array is required' }, { status: 400 });
    }

    if (phrasesData.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 phrases per bulk request' }, { status: 400 });
    }

    const results = {
      created: [] as any[],
      skipped: [] as any[],
      errors: [] as any[],
    };

    for (const phraseData of phrasesData) {
      const {
        phrase,
        translation,
        phonetic,
        difficulty,
        tags,
        notes,
      } = phraseData;

      // Validation
      if (!phrase || !translation) {
        results.errors.push({ phrase: phrase || 'unknown', error: 'Missing required fields' });
        continue;
      }

      if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
        results.errors.push({ phrase, error: 'Invalid difficulty' });
        continue;
      }

      // Check duplicate
      const existing = await db
        .select()
        .from(phrases)
        .where(eq(phrases.phrase, phrase))
        .limit(1);

      if (existing.length > 0) {
        results.skipped.push({ phrase, reason: 'already exists' });
        continue;
      }

      // Insert
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

      results.created.push(newPhrase);
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
    console.error('Bulk create phrases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/phrases/bulk - Bulk delete phrases (admin only)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin only for bulk operations on global phrases
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

    await db.delete(phrases).where(inArray(phrases.id, ids));

    // Also delete related user progress
    await db.delete(userPhrases).where(inArray(userPhrases.phraseId, ids));

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    console.error('Bulk delete phrases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/phrases/bulk - Bulk update user progress (favorite/learned)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { phraseIds, isFavorite, isLearned } = body;

    if (!Array.isArray(phraseIds) || phraseIds.length === 0) {
      return NextResponse.json({ error: 'phraseIds array is required' }, { status: 400 });
    }

    if (phraseIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 IDs per bulk request' }, { status: 400 });
    }

    // Verify all phrases exist
    const existing = await db
      .select({ id: phrases.id })
      .from(phrases)
      .where(inArray(phrases.id, phraseIds));

    const validIds = existing.map(p => p.id);
    const invalidIds = phraseIds.filter(id => !validIds.includes(id));

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid phrase IDs provided' }, { status: 400 });
    }

    // Bulk upsert user progress
    const updates = validIds.map(phraseId => ({
      userId,
      phraseId,
      ...(isFavorite !== undefined && { isFavorite }),
      ...(isLearned !== undefined && { isLearned }),
      updatedAt: new Date(),
    }));

    await db
      .insert(userPhrases)
      .values(updates)
      .onConflictDoUpdate({
        target: [userPhrases.userId, userPhrases.phraseId],
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
    console.error('Bulk update phrases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}