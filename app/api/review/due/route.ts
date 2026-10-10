import { NextResponse } from 'next/server';
import { db, userVocabulary, vocabulary, userPhrases, phrases } from '@/lib/db';
import { eq, and, lte, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all'; // all, vocabulary, phrases
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const now = new Date();

  // Get due vocabulary reviews
  const getVocabReviews = async () => {
    if (type === 'phrases') return [];

    const rows = await db
      .select({
        id: userVocabulary.id,
        itemType: sql`'vocabulary'`.as('item_type'),
        itemId: userVocabulary.vocabularyId,
        status: userVocabulary.status,
        isFavorite: userVocabulary.isFavorite,
        isLearned: userVocabulary.isLearned,
        correctCount: userVocabulary.correctCount,
        wrongCount: userVocabulary.wrongCount,
        lastReviewedAt: userVocabulary.lastReviewedAt,
        nextReviewAt: userVocabulary.nextReviewAt,
        easeFactor: userVocabulary.easeFactor,
        interval: userVocabulary.interval,
        repetition: userVocabulary.repetition,
        // Vocabulary details
        word: vocabulary.word,
        translation: vocabulary.translation,
        definition: vocabulary.definition,
        partOfSpeech: vocabulary.partOfSpeech,
        difficulty: vocabulary.difficulty,
        exampleSentence: vocabulary.exampleSentence,
        phonetic: vocabulary.phonetic,
      })
      .from(userVocabulary)
      .innerJoin(vocabulary, eq(vocabulary.id, userVocabulary.vocabularyId))
      .where(
        and(
          eq(userVocabulary.userId, userId),
          lte(userVocabulary.nextReviewAt, now)
        )
      )
      .orderBy(userVocabulary.nextReviewAt)
      .limit(limit);

    return rows;
  };

  // Get due phrase reviews
  const getPhraseReviews = async () => {
    if (type === 'vocabulary') return [];

    const rows = await db
      .select({
        id: userPhrases.id,
        itemType: sql`'phrases'`.as('item_type'),
        itemId: userPhrases.phraseId,
        status: userPhrases.status,
        isFavorite: userPhrases.isFavorite,
        isLearned: userPhrases.isLearned,
        correctCount: userPhrases.correctCount,
        wrongCount: userPhrases.wrongCount,
        lastReviewedAt: userPhrases.lastReviewedAt,
        nextReviewAt: userPhrases.nextReviewAt,
        easeFactor: userPhrases.easeFactor,
        interval: userPhrases.interval,
        repetition: userPhrases.repetition,
        // Phrase details
        phrase: phrases.phrase,
        translation: phrases.translation,
        phonetic: phrases.phonetic,
        difficulty: phrases.difficulty,
      })
      .from(userPhrases)
      .innerJoin(phrases, eq(phrases.id, userPhrases.phraseId))
      .where(
        and(
          eq(userPhrases.userId, userId),
          lte(userPhrases.nextReviewAt, now)
        )
      )
      .orderBy(userPhrases.nextReviewAt)
      .limit(limit);

    return rows;
  };

  const [vocabReviews, phraseReviews] = await Promise.all([
    getVocabReviews(),
    getPhraseReviews(),
  ]);

  // Combine and sort by nextReviewAt
  const allReviews = [...vocabReviews, ...phraseReviews]
    .sort((a, b) => {
      const aTime = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : Infinity;
      const bTime = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : Infinity;
      return aTime - bTime;
    })
    .slice(0, limit);

  // Also get counts for each type
  const [vocabCount, phraseCount] = await Promise.all([
    type !== 'phrases'
      ? db
          .select({ count: sql`count(*)` })
          .from(userVocabulary)
          .where(
            and(
              eq(userVocabulary.userId, userId),
              lte(userVocabulary.nextReviewAt, now)
            )
          )
      : Promise.resolve([{ count: 0 }]),
    type !== 'vocabulary'
      ? db
          .select({ count: sql`count(*)` })
          .from(userPhrases)
          .where(
            and(
              eq(userPhrases.userId, userId),
              lte(userPhrases.nextReviewAt, now)
            )
          )
      : Promise.resolve([{ count: 0 }]),
  ]);

  return NextResponse.json({
    reviews: allReviews,
    counts: {
      vocabulary: Number(vocabCount[0]?.count ?? 0),
      phrases: Number(phraseCount[0]?.count ?? 0),
      total: Number(vocabCount[0]?.count ?? 0) + Number(phraseCount[0]?.count ?? 0),
    },
  });
}