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
// TABEL USER_VOCABULARY (progres belajar user)
// ============================================
export const userVocabulary = pgTable(
  'user_vocabulary',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    vocabularyId: text('vocabulary_id')
      .notNull()
      .references(() => vocabulary.id, { onDelete: 'cascade' }),
    status: text('status').default('learning'),
    correctCount: integer('correct_count').default(0),
    wrongCount: integer('wrong_count').default(0),
    lastReviewedAt: timestamp('last_reviewed_at'),
    nextReviewAt: timestamp('next_review_at'),
    easeFactor: integer('ease_factor').default(2.5),
    interval: integer('interval').default(0),
    repetition: integer('repetition').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userVocabIdx: uniqueIndex('user_vocab_idx').on(table.userId, table.vocabularyId),
    nextReviewIdx: index('next_review_idx').on(table.nextReviewAt),
  })
);

// ============================================
// TABEL LEARNING_SESSIONS (catatan belajar)
// ============================================
export const learningSessions = pgTable(
  'learning_sessions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionType: text('session_type').notNull(),
    score: integer('score'),
    totalQuestions: integer('total_questions'),
    correctAnswers: integer('correct_answers'),
    durationSeconds: integer('duration_seconds'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
  },
  (table) => ({
    userSessionIdx: index('user_session_idx').on(table.userId),
  })
);

// ============================================
// TABEL AI_INTERACTIONS (cache AI)
// ============================================
export const aiInteractions = pgTable(
  'ai_interactions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull(),
    response: text('response').notNull(),
    modelUsed: text('model_used').notNull(),
    tokensUsed: integer('tokens_used'),
    cacheHit: boolean('cache_hit').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userAIIndex: index('user_ai_idx').on(table.userId),
  })
);