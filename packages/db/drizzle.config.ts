import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({
  path: resolve(process.cwd(), '../../apps/web/.env.local'),
});

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error('❌ DIRECT_URL atau DATABASE_URL belum diset untuk drizzle-kit.');
}

export default defineConfig({
  schema: './schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
  strict: true,
  verbose: false,
});