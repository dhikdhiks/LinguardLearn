import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// === BACA .env.local DARI APPS/WEB ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

config({ path: resolve(__dirname, '../../apps/web/.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('❌ DATABASE_URL not set! Pastikan apps/web/.env.local ada.');
}

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// === EKSPOR SEMUA SCHEMA SECARA EKSPLISIT ===
export {
  users,
  vocabulary,
  userVocabulary,
  learningSessions,
  aiInteractions,
  difficultyEnum,
  partOfSpeechEnum,
  wordStatusEnum,
  sessionTypeEnum,
} from './schema';

// Re-export helper functions from drizzle-orm
export { count, eq, and, or, sql, desc, asc, like, ilike, inArray, not, isNull, isNotNull } from 'drizzle-orm';