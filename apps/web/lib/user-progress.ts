import { db, vocabulary, userVocabulary, phrases, userPhrases } from 'db';
import { eq, and, sql } from 'drizzle-orm';

// ============================================================
// HELPER DATA PER-USER
// isFavorite / isLearned kini disimpan PER-USER di
// user_vocabulary & user_phrases, bukan lagi global.
// ============================================================

type Flags = { isFavorite?: boolean; isLearned?: boolean };

// ---------- VOCABULARY ----------
export async function getVocabularyWithFlags(userId: string) {
  const rows = await db
    .select({
      vocab: vocabulary,
      isFavorite: userVocabulary.isFavorite,
      isLearned: userVocabulary.isLearned,
    })
    .from(vocabulary)
    .leftJoin(
      userVocabulary,
      and(
        eq(userVocabulary.vocabularyId, vocabulary.id),
        eq(userVocabulary.userId, userId)
      )
    )
    .orderBy(vocabulary.word);

  return rows.map((r) => ({
    ...r.vocab,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));
}

export async function getVocabularyWordWithFlags(userId: string, wordId: string) {
  const rows = await db
    .select({
      vocab: vocabulary,
      isFavorite: userVocabulary.isFavorite,
      isLearned: userVocabulary.isLearned,
    })
    .from(vocabulary)
    .leftJoin(
      userVocabulary,
      and(
        eq(userVocabulary.vocabularyId, vocabulary.id),
        eq(userVocabulary.userId, userId)
      )
    )
    .where(eq(vocabulary.id, wordId))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r.vocab,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  };
}

export async function setVocabularyFlags(
  userId: string,
  wordId: string,
  flags: Flags
) {
  await db
    .insert(userVocabulary)
    .values({
      userId,
      vocabularyId: wordId,
      isFavorite: flags.isFavorite ?? false,
      isLearned: flags.isLearned ?? false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userVocabulary.userId, userVocabulary.vocabularyId],
      set: {
        ...(flags.isFavorite !== undefined && { isFavorite: flags.isFavorite }),
        ...(flags.isLearned !== undefined && { isLearned: flags.isLearned }),
        updatedAt: new Date(),
      },
    });
}

export async function getRandomUnlearnedWords(userId: string, limit: number) {
  const rows = await db
    .select({
      vocab: vocabulary,
      isFavorite: userVocabulary.isFavorite,
      isLearned: userVocabulary.isLearned,
    })
    .from(vocabulary)
    .leftJoin(
      userVocabulary,
      and(
        eq(userVocabulary.vocabularyId, vocabulary.id),
        eq(userVocabulary.userId, userId)
      )
    )
    .where(
      sql`${vocabulary.difficulty} IN ('intermediate', 'advanced')
        AND COALESCE(${userVocabulary.isLearned}, false) = false`
    )
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  return rows.map((r) => ({
    ...r.vocab,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));
}

// ---------- PHRASES ----------
export async function getPhrasesWithFlags(userId: string) {
  const rows = await db
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
        eq(userPhrases.userId, userId)
      )
    )
    .orderBy(phrases.phrase);

  return rows.map((r) => ({
    ...r.phrase,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));
}

export async function getPhraseWithFlags(userId: string, phraseId: string) {
  const rows = await db
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
        eq(userPhrases.userId, userId)
      )
    )
    .where(eq(phrases.id, phraseId))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r.phrase,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  };
}

export async function setPhraseFlags(
  userId: string,
  phraseId: string,
  flags: Flags
) {
  await db
    .insert(userPhrases)
    .values({
      userId,
      phraseId,
      isFavorite: flags.isFavorite ?? false,
      isLearned: flags.isLearned ?? false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userPhrases.userId, userPhrases.phraseId],
      set: {
        ...(flags.isFavorite !== undefined && { isFavorite: flags.isFavorite }),
        ...(flags.isLearned !== undefined && { isLearned: flags.isLearned }),
        updatedAt: new Date(),
      },
    });
}