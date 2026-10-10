-- ============================================================
-- FULL-TEXT SEARCH INDEXES untuk vocabulary & phrases
-- ============================================================

-- 1. Add tsvector columns for full-text search
ALTER TABLE "vocabulary" 
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE("word", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("translation", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE("definition", '')), 'C') ||
    setweight(to_tsvector('english', COALESCE("example_sentence", '')), 'D')
  ) STORED;

ALTER TABLE "phrases" 
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE("phrase", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("translation", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE("notes", '')), 'C')
  ) STORED;

-- 2. Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS "vocabulary_search_vector_idx" ON "vocabulary" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "phrases_search_vector_idx" ON "phrases" USING GIN ("search_vector");

-- 3. Also add Indonesian language support (optional - requires postgresql-contrib)
-- ALTER TABLE "vocabulary" 
--   ADD COLUMN IF NOT EXISTS "search_vector_id" tsvector 
--   GENERATED ALWAYS AS (
--     setweight(to_tsvector('indonesian', COALESCE("word", '')), 'A') ||
--     setweight(to_tsvector('indonesian', COALESCE("translation", '')), 'B') ||
--     setweight(to_tsvector('indonesian', COALESCE("definition", '')), 'C') ||
--     setweight(to_tsvector('indonesian', COALESCE("example_sentence", '')), 'D')
--   ) STORED;
-- CREATE INDEX IF NOT EXISTS "vocabulary_search_vector_id_idx" ON "vocabulary" USING GIN ("search_vector_id");

-- 4. Trigram indexes for fuzzy search (requires pg_trgm extension)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS "vocabulary_word_trgm_idx" ON "vocabulary" USING GIN ("word" gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS "vocabulary_translation_trgm_idx" ON "vocabulary" USING GIN ("translation" gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS "phrases_phrase_trgm_idx" ON "phrases" USING GIN ("phrase" gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS "phrases_translation_trgm_idx" ON "phrases" USING GIN ("translation" gin_trgm_ops);

-- ============================================================
-- Example queries for full-text search:
-- 
-- Vocabulary:
-- SELECT * FROM vocabulary 
-- WHERE search_vector @@ plainto_tsquery('english', 'hello world')
-- ORDER BY ts_rank_cd(search_vector, plainto_tsquery('english', 'hello world')) DESC;
-- 
-- Phrases:
-- SELECT * FROM phrases 
-- WHERE search_vector @@ plainto_tsquery('english', 'good morning')
-- ORDER BY ts_rank_cd(search_vector, plainto_tsquery('english', 'good morning')) DESC;
-- 
-- Combined with user flags:
-- SELECT v.*, uv.is_favorite, uv.is_learned
-- FROM vocabulary v
-- LEFT JOIN user_vocabulary uv ON uv.vocabulary_id = v.id AND uv.user_id = 'user123'
-- WHERE v.search_vector @@ plainto_tsquery('english', 'hello')
-- ORDER BY ts_rank_cd(v.search_vector, plainto_tsquery('english', 'hello')) DESC;
-- ============================================================