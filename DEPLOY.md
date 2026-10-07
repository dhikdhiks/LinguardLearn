# Deploy ke Vercel + Supabase

## 1. Siapkan Supabase
1. Buat project di [supabase.com](https://supabase.com)
2. Dapatkan **DATABASE_URL** (Connection Pooling - Transaction mode, port 6543) dan **DIRECT_URL** (Direct Connection, port 5432)
   - Settings > Database > Connection String

Format Transaction Pooler (untuk Vercel/serverless):
```text
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

Format Direct (untuk migrate):
```text
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## 2. Jalankan Migrasi ke Supabase (dari lokal)
```bash
cd /home/suradems/projects/LinguardLearn
pnpm db:generate  # jika ada perubahan schema
pnpm db:migrate   # jalankan migrasi ke DB remote
```

> Pastikan `DIRECT_URL` terisi di `.env.local` saat migrate (lebih stabil).

## 3. Setup Vercel
1. Import repo ke [vercel.com](https://vercel.com)
2. Root Directory: `./` (monorepo). Vercel akan auto-detect Next.js di `apps/web`
3. Set Environment Variables di Project Settings > Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Transaction Pooler URL (port 6543) | Wajib (Serverless) |
| `DIRECT_URL` | Direct Connection URL (port 5432) | Opsional (untuk migrate lokal) |
| `AUTH_SECRET` | `openssl rand -base64 32` | Wajib |
| `AUTH_GOOGLE_ID` | Client ID Google OAuth | Opsional |
| `AUTH_GOOGLE_SECRET` | Client Secret Google OAuth | Opsional |
| `AUTH_TRUST_HOST` | `true` | Wajib untuk Vercel |

4. Build & Deploy: Vercel otomatis build dengan `pnpm build` (sesuai vercel.json)

## 4. Health Check
Setelah deploy, cek: `https://your-domain.vercel.app/api/health`

Harus return `{ "ok": true, ... }`. Jika ada `missingTables`, jalankan migrate ke Supabase dulu.

## 5. Tips Optimasi
- Gunakan **Transaction Pooler** (port 6543) untuk runtime (Vercel). Hindari direct connection di serverless.
- API Routes punya `maxDuration: 30s` di vercel.json (bisa dinaikkan kalau butuh).
- Next.js 15 + optimasi package imports sudah aktif.
- DB pakai singleton connection (mengurangi reconnect di serverless). 

## Struktur Deploy
- Frontend/API: Next.js App Router (`apps/web`) di Vercel
- Database: Supabase (Postgres) via Drizzle ORM
- Monorepo: Turborepo + pnpm workspaces
