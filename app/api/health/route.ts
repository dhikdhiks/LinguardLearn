import { NextResponse } from 'next/server';

// Endpoint diagnosa DEPLOY (mis. Vercel).
// Buka di browser: https://<domain>/api/health
// Menjawab: apakah DATABASE_URL terset, DB bisa dikoneksi,
// dan tabel mana yang belum dibuat (migration belum dijalankan).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'users',
  'vocabulary',
  'user_vocabulary',
  'phrases',
  'user_phrases',
  'learning_sessions',
  'ai_interactions',
];

export async function GET() {
  const result: Record<string, unknown> = {
    ok: false,
    databaseUrlSet: !!process.env.DATABASE_URL,
    authSecretSet: !!process.env.AUTH_SECRET,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  };

  if (!process.env.DATABASE_URL) {
    result.error =
      'DATABASE_URL belum diset di environment server (Vercel → Settings → Environment Variables).';
    return NextResponse.json(result, { status: 500 });
  }

  try {
    const { client } = await import('@/lib/db');

    // Tes koneksi & daftar tabel yang sudah ada
    const tables = await client<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const existing = new Set(
      (Array.isArray(tables) ? tables : []).map((r) => r.table_name)
    );
    result.missingTables = REQUIRED_TABLES.filter((t) => !existing.has(t));

    result.ok = (result.missingTables as string[]).length === 0;
    if (!result.ok) {
      result.error =
        'Ada tabel yang belum dibuat di database. Jalankan migration dari laptop: DATABASE_URL="<url-db-hosted>" pnpm db:migrate';
    }
  } catch (err) {
    result.error =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}