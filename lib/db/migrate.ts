import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
config({ path: resolve(__dirname, '../../.env.local') });

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './index';

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: resolve(__dirname, 'migrations') });
  console.log('Migrations done.');
  await client.end();
}
main().catch(console.error);