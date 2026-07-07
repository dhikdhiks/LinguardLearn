import { and, eq } from 'drizzle-orm';
import { db } from '../index';
import { userVocabulary } from '../schema';

// Kualitas jawaban: 0 = lupa total, 1 = salah, 2 = ragu-ragu, 3 = agak ingat, 4 = benar, 5 = sangat mudah
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function calculateSM2(
  currentEaseFactor: number,
  currentRepetition: number,
  quality: Quality
): {
  newEaseFactor: number;
  newRepetition: number;
  newInterval: number;
} {
  let ef = currentEaseFactor;
  let rep = currentRepetition;
  let interval = 0;

  if (quality >= 3) {
    // Jawaban benar
    rep += 1;
    if (rep === 1) {
      interval = 1;
    } else if (rep === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    // Update ease factor
    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ef = Math.max(1.3, ef); // minimal 1.3
  } else {
    // Jawaban salah → reset
    rep = 0;
    interval = 0;
    // Ease factor tetap (atau turun sedikit, opsional)
  }

  return { newEaseFactor: ef, newRepetition: rep, newInterval: interval };
}

export async function updateVocabularyProgress(
  userId: string,
  vocabularyId: string,
  quality: Quality
) {
  // 1. Cari data userVocabulary
  const existing = await db
    .select()
    .from(userVocabulary)
    .where(
      and(
        eq(userVocabulary.userId, userId),
        eq(userVocabulary.vocabularyId, vocabularyId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    throw new Error('Vocabulary not found in user\'s learning list');
  }

  const record = existing[0];
  const { easeFactor, repetition, interval } = calculateSM2(
    record.easeFactor || 2.5,
    record.repetition || 0,
    quality
  );

  const nextReview = quality >= 3
    ? new Date(Date.now() + interval * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // besok

  // 2. Update database
  await db
    .update(userVocabulary)
    .set({
      easeFactor,
      repetition,
      interval,
      lastReviewedAt: new Date(),
      nextReviewAt: nextReview,
      status: quality >= 3 ? 'reviewed' : 'learning',
      correctCount: quality >= 3 ? record.correctCount + 1 : record.correctCount,
      wrongCount: quality < 3 ? record.wrongCount + 1 : record.wrongCount,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userVocabulary.userId, userId),
        eq(userVocabulary.vocabularyId, vocabularyId)
      )
    );

  return { easeFactor, repetition, interval, nextReview };
}