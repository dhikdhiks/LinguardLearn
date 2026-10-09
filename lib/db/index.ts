import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// === BACA .env.local DARI ROOT PROJECT (dev) ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Hanya baca .env.local di development, bukan di production
// (di Vercel semua env sudah di-inject oleh platform, file ini tidak ada)
config({
  path: resolve(__dirname, '../../.env.local'),
  override: false,
});

// Gunakan DATABASE_URL (pooler) untuk runtime serverless (Vercel).
// Opsional: DIRECT_URL untuk migrasi (non-pooled, direct TCP).
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL; // fallback tidak aman, jaga-jaga

if (!connectionString) {
  throw new Error(
    '❌ DATABASE_URL (atau POSTGRES_URL) belum diset! Tambahkan di .env.local atau Vercel Environment Variables.'
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __db__: PostgresJsDatabase<typeof schema> | undefined;
  // eslint-disable-next-line no-var
  var __pgClient__: ReturnType<typeof postgres> | undefined;
}

const isProd = process.env.NODE_ENV === 'production';

const client =
  globalThis.__pgClient__ ??
  postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: isProd ? 10 : 20, // lebih konservatif di serverless
    idle_timeout: 20, // detik
    connect_timeout: 10, // detik
    prepare: false, // hindari prepared stmt issue di pooler (pgbouncer transaction mode)
  });

if (!globalThis.__pgClient__) {
  globalThis.__pgClient__ = client;
}

export const db: PostgresJsDatabase<typeof schema> =
  globalThis.__db__ ?? drizzle(client, { schema });

if (!globalThis.__db__) {
  globalThis.__db__ = db;
}

export { client };

// === EKSPOR SEMUA SCHEMA SECARA EKSPLISIT ===
export {
  users,
  vocabulary,
  userVocabulary,
  userPhrases,
  learningSessions,
  aiInteractions,
  difficultyEnum,
  partOfSpeechEnum,
  phrases,
  quizCustomSets,
  quizCustomSetItems,
  quizCustomAttempts,
} from './schema';

// Re-export helper functions from drizzle-orm
export {
  count,
  eq,
  and,
  or,
  sql,
  desc,
  asc,
  like,
  ilike,
  inArray,
  not,
  isNull,
  isNotNull,
} from 'drizzle-orm';

// === TYPES EXPORT ===
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
export * as schema from './schema';