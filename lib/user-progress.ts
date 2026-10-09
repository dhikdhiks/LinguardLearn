import { db, vocabulary, userVocabulary, phrases, userPhrases } from '@/lib/db';
import { eq, and, sql, desc, asc, count } from 'drizzle-orm';

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

// ============================================================
// PROJECTION: hanya kolom yang dibutuhkan untuk list (ringan)
// ============================================================
const VOCAB_LIST_FIELDS = {
  id: vocabulary.id,
  word: vocabulary.word,
  translation: vocabulary.translation,
  definition: vocabulary.definition,
  partOfSpeech: vocabulary.partOfSpeech,
  difficulty: vocabulary.difficulty,
  exampleSentence: vocabulary.exampleSentence,
  phonetic: vocabulary.phonetic,
  v1: vocabulary.v1,
  v2: vocabulary.v2,
  v3: vocabulary.v3,
  v_ing: vocabulary.v_ing,
  v_s: vocabulary.v_s,
  plural_form: vocabulary.plural_form,
  synonyms: vocabulary.synonyms,
  antonyms: vocabulary.antonyms,
  notes: vocabulary.notes,
  tags: vocabulary.tags,
  isFavorite: userVocabulary.isFavorite,
  isLearned: userVocabulary.isLearned,
};

export async function getVocabularyListWithFlags(userId: string) {
  const rows = await db
    .select(VOCAB_LIST_FIELDS)
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
    ...r,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));
}

// ============================================================
// WORD OF THE DAY: 1 kata acak tanpa menarik seluruh tabel
// Pakai count + offset (index PK), bukan SELECT semua kolom.
// ============================================================
export async function getRandomVocabularyWithFlags(userId: string) {
  const countResult = await db.select({ count: count(vocabulary.id) }).from(vocabulary);
  const total = countResult[0]?.count ?? 0;
  if (total === 0) return null;

  const offset = Math.floor(Math.random() * total);

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
    .orderBy(vocabulary.id)
    .limit(1)
    .offset(offset);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r.vocab,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  };
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

// ============================================================
// RANDOM OPTIMIZED: pakai ID-range + filter, BUKAN ORDER BY RANDOM()
// Menghindari full table scan di tabel besar (Supabase/Postgres).
// ============================================================
export async function getRandomUnlearnedWords(userId: string, limit: number) {
  // 1. Ambil total count unlearned intermediate/advanced (untuk hitung range)
  const countResult = await db
    .select({ count: count(vocabulary.id) })
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
    );

  const total = countResult[0]?.count ?? 0;
  if (total === 0) return [];

  // 2. Gunakan ID-range sampling: ambil offset acak, lalu LIMIT
  //    (lebih cepat dari RANDOM() karena index bisa dipakai)
  const randomOffset = Math.floor(Math.random() * Math.max(1, total - limit + 1));

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
    .orderBy(vocabulary.id) // stable ordering via PK
    .limit(limit)
    .offset(randomOffset);

  // Jika hasil kurang dari limit (offset di akhir), ambil dari awal
  if (rows.length < limit) {
    const remaining = limit - rows.length;
    const extraRows = await db
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
      .orderBy(vocabulary.id)
      .limit(remaining);
    rows.push(...extraRows);
  }

  // Shuffle hasil di memory (client-side shuffle untuk variasi, limit kecil)
  const shuffled = rows.sort(() => Math.random() - 0.5);

  return shuffled.map((r) => ({
    ...r.vocab,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));
}

// ============================================================
// PHRASES PROJECTION (ringan untuk list)
// ============================================================
const PHRASE_LIST_FIELDS = {
  id: phrases.id,
  phrase: phrases.phrase,
  translation: phrases.translation,
  phonetic: phrases.phonetic,
  difficulty: phrases.difficulty,
  tags: phrases.tags,
  notes: phrases.notes,
  isFavorite: userPhrases.isFavorite,
  isLearned: userPhrases.isLearned,
};

export async function getPhrasesListWithFlags(userId: string) {
  const rows = await db
    .select(PHRASE_LIST_FIELDS)
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
    ...r,
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

// ============================================================
// RANDOM PHRASES OPTIMIZED (mirip vocabulary)
// ============================================================
export async function getRandomUnlearnedPhrases(userId: string, limit: number) {
  const countResult = await db
    .select({ count: count(phrases.id) })
    .from(phrases)
    .leftJoin(
      userPhrases,
      and(
        eq(userPhrases.phraseId, phrases.id),
        eq(userPhrases.userId, userId)
      )
    )
    .where(sql`COALESCE(${userPhrases.isLearned}, false) = false`);

  const total = countResult[0]?.count ?? 0;
  if (total === 0) return [];

  const randomOffset = Math.floor(Math.random() * Math.max(1, total - limit + 1));

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
    .where(sql`COALESCE(${userPhrases.isLearned}, false) = false`)
    .orderBy(phrases.id)
    .limit(limit)
    .offset(randomOffset);

  if (rows.length < limit) {
    const remaining = limit - rows.length;
    const extraRows = await db
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
      .where(sql`COALESCE(${userPhrases.isLearned}, false) = false`)
      .orderBy(phrases.id)
      .limit(remaining);
    rows.push(...extraRows);
  }

  const shuffled = rows.sort(() => Math.random() - 0.5);

  return shuffled.map((r) => ({
    ...r.phrase,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));
}

// ============================================================
// COUNT HELPERS untuk Dashboard (SQL-side, bukan client-side filter)
// ============================================================
export async function getVocabularyStats(userId: string) {
  const [totalResult, learnedResult, favoriteResult] = await Promise.all([
    db.select({ count: count(vocabulary.id) }).from(vocabulary),
    db
      .select({ count: count(userVocabulary.id) })
      .from(userVocabulary)
      .where(and(eq(userVocabulary.userId, userId), eq(userVocabulary.isLearned, true))),
    db
      .select({ count: count(userVocabulary.id) })
      .from(userVocabulary)
      .where(and(eq(userVocabulary.userId, userId), eq(userVocabulary.isFavorite, true))),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const learned = learnedResult[0]?.count ?? 0;
  const favorite = favoriteResult[0]?.count ?? 0;

  return {
    total,
    learned,
    unlearned: total - learned,
    favorite,
    percentage: total > 0 ? Math.round((learned / total) * 100) : 0,
  };
}

export async function getPhrasesStats(userId: string) {
  const [totalResult, learnedResult, favoriteResult] = await Promise.all([
    db.select({ count: count(phrases.id) }).from(phrases),
    db
      .select({ count: count(userPhrases.id) })
      .from(userPhrases)
      .where(and(eq(userPhrases.userId, userId), eq(userPhrases.isLearned, true))),
    db
      .select({ count: count(userPhrases.id) })
      .from(userPhrases)
      .where(and(eq(userPhrases.userId, userId), eq(userPhrases.isFavorite, true))),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const learned = learnedResult[0]?.count ?? 0;
  const favorite = favoriteResult[0]?.count ?? 0;

  return {
    total,
    learned,
    unlearned: total - learned,
    favorite,
    percentage: total > 0 ? Math.round((learned / total) * 100) : 0,
  };
}