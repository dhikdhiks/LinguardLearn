import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db, phrases, userPhrases } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { getRandomVocabularyWithFlags, getVocabularyStats, getPhrasesStats } from '@/lib/user-progress';
import DashboardContent from '@/components/DashboardContent';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Use SQL-side counts (lightweight) for stats instead of loading all rows.
  const [vocabStats, phraseStats] = await Promise.all([
    getVocabularyStats(session.user.id),
    getPhrasesStats(session.user.id),
  ]);

  // Fetch one random word (lightweight query, does not pull the whole table).
  const randomWord = await getRandomVocabularyWithFlags(session.user.id);

  // Fetch unlearned phrases for PhrasesSection (limit 20 to stay lightweight).
  const unlearnedPhrasesResult = await db
    .select({
      phrase: phrases,
      isFavorite: userPhrases.isFavorite,
      isLearned: userPhrases.isLearned,
    })
    .from(phrases)
    .leftJoin(
      userPhrases,
      and(
        eq(userPhrases.phraseId, phrases.id),
        eq(userPhrases.userId, session.user.id)
      )
    )
    .where(sql`COALESCE(${userPhrases.isLearned}, false) = false`)
    .orderBy(phrases.id)
    .limit(20);

  const unlearnedPhrasesList = unlearnedPhrasesResult.map((r) => ({
    ...r.phrase,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));

  return (
    <DashboardContent
      userName={session.user.name ?? 'there'}
      vocabStats={vocabStats}
      phraseStats={phraseStats}
      randomWord={randomWord}
      unlearnedPhrasesList={unlearnedPhrasesList}
    />
  );
}
