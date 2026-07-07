import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

export const difficultyEnum = pgEnum('difficulty', ['beginner', 'intermediate', 'advanced']);
export const partOfSpeechEnum = pgEnum('part_of_speech', [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
]);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// TABEL VOCABULARY (KAMUS LENGKAP)
// ============================================
export const vocabulary = pgTable(
  'vocabulary',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    word: text('word').notNull().unique(),
    translation: text('translation'), // Terjemahan Indonesia
    definition: text('definition'),
    exampleSentence: text('example_sentence'),
    partOfSpeech: partOfSpeechEnum('part_of_speech'),
    difficulty: difficultyEnum('difficulty').default('beginner'),
    phonetic: text('phonetic'),
    audioUrl: text('audio_url'),
    isFavorite: boolean('is_favorite').default(false),
    isLearned: boolean('is_learned').default(false),
    tags: text('tags').array().default([]),

    // === VERB FORMS (jika kata kerja) ===
    v1: text('v1'), // base form
    v2: text('v2'), // past tense
    v3: text('v3'), // past participle
    v_ing: text('v_ing'), // present participle (-ing)
    v_s: text('v_s'), // third person singular (-s/-es)

    // === NOUN FORMS (jika kata benda) ===
    plural_form: text('plural_form'), // bentuk jamak

    // === SINONIM & ANTONIM ===
    synonyms: jsonb('synonyms').$type<string[]>().default([]),
    antonyms: jsonb('antonyms').$type<string[]>().default([]),

    // === CATATAN TAMBAHAN ===
    notes: text('notes'), // catatan pribadi

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    wordIdx: uniqueIndex('word_idx').on(table.word),
    partOfSpeechIdx: index('part_of_speech_idx').on(table.partOfSpeech),
  })
);

// ============================================
// HAPUS TABEL YANG TIDAK DIPERLUKAN
// user_vocabulary, learning_sessions, ai_interactions
// ============================================
// Kita akan drop tabel yang tidak diperlukan di migrasi berikutnya.
// Untuk sekarang, kita biarkan dulu, nanti kita hapus manual atau via migrasi.