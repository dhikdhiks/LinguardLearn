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
  uuid,
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
  // Nullable: user Google tidak punya password
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at'),
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
    // NOTE: isFavorite/isLearned kini PER-USER (lihat userVocabulary)
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
    // === FLAG PER-USER (sebelumnya global di tabel vocabulary) ===
    isFavorite: boolean('is_favorite').default(false),
    isLearned: boolean('is_learned').default(false),
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

export const phrases = pgTable(
  'phrases',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    phrase: text('phrase').notNull().unique(),
    translation: text('translation').notNull(),
    phonetic: text('phonetic'),
    difficulty: difficultyEnum('difficulty').default('beginner'),
    // NOTE: isFavorite/isLearned kini PER-USER (lihat userPhrases)
    tags: text('tags').array().default([]),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    phraseIdx: uniqueIndex('phrase_idx').on(table.phrase),
  })
);

// ============================================
// TABEL USER_PHRASES (progres & flag per-user)
// ============================================
export const userPhrases = pgTable(
  'user_phrases',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    phraseId: text('phrase_id')
      .notNull()
      .references(() => phrases.id, { onDelete: 'cascade' }),
    status: text('status').default('learning'),
    // === FLAG PER-USER (sebelumnya global di tabel phrases) ===
    isFavorite: boolean('is_favorite').default(false),
    isLearned: boolean('is_learned').default(false),
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
    userPhraseIdx: uniqueIndex('user_phrase_idx').on(table.userId, table.phraseId),
  })
);

// ============================================
// QUIZ CUSTOM - Tabel untuk kuis buatan user
// ============================================
export const quizCustomSets = pgTable(
  'quiz_custom_sets',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    // Tipe konten: vocabulary, phrases, mixed
    contentType: text('content_type').notNull().default('vocabulary'),
    // Arah soal: source_to_target (EN→ID), target_to_source (ID→EN), mixed
    direction: text('direction').notNull().default('source_to_target'),
    // Tipe pertanyaan: type_in (input manual), multiple_choice, mixed
    questionType: text('question_type').notNull().default('type_in'),
    // Jumlah soal per sesi (0 = semua)
    questionsPerSession: integer('questions_per_session').default(0),
    // Acak urutan soal
    shuffleQuestions: boolean('shuffle_questions').default(true),
    // Acak opsi multiple choice
    shuffleOptions: boolean('shuffle_options').default(true),
    isPublic: boolean('is_public').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userQuizIdx: index('user_quiz_idx').on(table.userId),
    publicQuizIdx: index('public_quiz_idx').on(table.isPublic),
  })
);

export const quizCustomSetItems = pgTable(
  'quiz_custom_set_items',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    setId: text('set_id')
      .notNull()
      .references(() => quizCustomSets.id, { onDelete: 'cascade' }),
    // Referensi ke vocabulary atau phrases
    itemType: text('item_type').notNull(), // 'vocabulary' | 'phrases'
    itemId: text('item_id').notNull(),
    // Override untuk soal ini (opsional - freeze jawaban)
    customQuestion: text('custom_question'),
    customAnswer: text('custom_answer'),
    // Urutan manual (0 = auto)
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    setItemIdx: uniqueIndex('set_item_idx').on(table.setId, table.itemType, table.itemId),
    setOrderIdx: index('set_order_idx').on(table.setId, table.sortOrder),
  })
);

export const quizCustomAttempts = pgTable(
  'quiz_custom_attempts',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    setId: text('set_id')
      .notNull()
      .references(() => quizCustomSets.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    correctAnswers: integer('correct_answers').notNull(),
    wrongAnswers: integer('wrong_answers').notNull(),
    durationSeconds: integer('duration_seconds'),
    // Detail jawaban per soal (JSON)
    answers: jsonb('answers').$type<QuizAnswer[]>().default([]),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
  },
  (table) => ({
    attemptSetIdx: index('attempt_set_idx').on(table.setId),
    attemptUserIdx: index('attempt_user_idx').on(table.userId),
    attemptStartedIdx: index('attempt_started_idx').on(table.startedAt),
  })
);

// Type untuk jawaban di quizCustomAttempts
export type QuizAnswer = {
  itemId: string;
  itemType: 'vocabulary' | 'phrases';
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs?: number;
};