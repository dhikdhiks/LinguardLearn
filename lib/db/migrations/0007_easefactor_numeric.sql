-- ============================================================
-- CHANGE easeFactor from integer to numeric(4,2) for precision
-- ============================================================

-- 1. Alter user_vocabulary.easeFactor
ALTER TABLE "user_vocabulary" ALTER COLUMN "ease_factor" TYPE numeric(4,2) USING "ease_factor"::numeric(4,2);
ALTER TABLE "user_vocabulary" ALTER COLUMN "ease_factor" SET DEFAULT 2.50;

-- 2. Alter user_phrases.easeFactor
ALTER TABLE "user_phrases" ALTER COLUMN "ease_factor" TYPE numeric(4,2) USING "ease_factor"::numeric(4,2);
ALTER TABLE "user_phrases" ALTER COLUMN "ease_factor" SET DEFAULT 2.50;