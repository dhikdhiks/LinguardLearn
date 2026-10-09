-- ============================================================
-- PERFORMANCE INDEXES untuk query cepat di data besar
-- ============================================================

-- 1. User vocabulary: filter by user + learned status (dashboard, random)
CREATE INDEX IF NOT EXISTS "user_vocab_learned_idx" ON "user_vocabulary" USING btree ("user_id", "is_learned");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_vocab_favorite_idx" ON "user_vocabulary" USING btree ("user_id", "is_favorite");--> statement-breakpoint

-- 2. User phrases: filter by user + learned status
CREATE INDEX IF NOT EXISTS "user_phrases_learned_idx" ON "user_phrases" USING btree ("user_id", "is_learned");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_phrases_favorite_idx" ON "user_phrases" USING btree ("user_id", "is_favorite");--> statement-breakpoint

-- 3. Vocabulary: filter by difficulty + word ordering
CREATE INDEX IF NOT EXISTS "vocab_difficulty_idx" ON "vocabulary" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vocab_word_lower_idx" ON "vocabulary" USING btree (lower("word"));--> statement-breakpoint

-- 4. Phrases: filter by difficulty
CREATE INDEX IF NOT EXISTS "phrases_difficulty_idx" ON "phrases" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phrases_phrase_lower_idx" ON "phrases" USING btree (lower("phrase"));--> statement-breakpoint

-- 5. Learning sessions: user + time range queries
CREATE INDEX IF NOT EXISTS "learning_sessions_user_started_idx" ON "learning_sessions" USING btree ("user_id", "started_at" DESC);--> statement-breakpoint

-- 6. AI interactions: user + time
CREATE INDEX IF NOT EXISTS "ai_interactions_user_created_idx" ON "ai_interactions" USING btree ("user_id", "created_at" DESC);--> statement-breakpoint

-- 7. User vocabulary: next_review_at untuk spaced repetition
CREATE INDEX IF NOT EXISTS "user_vocab_next_review_idx" ON "user_vocabulary" USING btree ("user_id", "next_review_at");--> statement-breakpoint

-- 8. User phrases: next_review_at untuk spaced repetition
CREATE INDEX IF NOT EXISTS "user_phrases_next_review_idx" ON "user_phrases" USING btree ("user_id", "next_review_at");
