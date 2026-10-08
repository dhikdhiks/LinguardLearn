'use server';

import { signIn, signOut } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';

export type AuthFormState = {
  error?: string;
  success?: boolean;
};

// ============================================
// Rate limit sederhana (in-memory) untuk login
// Mencegah brute force dari satu proses server
// ============================================
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function clearAttempts(key: string) {
  loginAttempts.delete(key);
}

// ============================================
// PESAN ERROR AUTH — bedakan "konfigurasi server"
// (AUTH_SECRET/DATABASE_URL belum diatur) vs kredensial salah
// ============================================
function authErrorMessage(error: unknown, fallback = 'Email atau password salah.'): string {
  if (error instanceof AuthError) {
    const code =
      (error as AuthError & { code?: string }).code ||
      (error as AuthError & { type?: string }).type ||
      '';
    // AUTH_SECRET / DATABASE_URL belum diset di server (mis. Vercel)
    if (code === 'configuration' || error.name === 'MissingSecret') {
      return 'Konfigurasi server belum lengkap (AUTH_SECRET / DATABASE_URL belum diatur di server). Coba lagi nanti.';
    }
    return fallback;
  }
  return 'Terjadi kesalahan server. Coba lagi nanti.';
}

// ============================================
// VALIDASI
// ============================================
function validateRegister(input: {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}): string | null {
  const name = (input.name || '').trim();
  const email = (input.email || '').trim().toLowerCase();
  const password = input.password || '';
  const confirm = input.confirm || '';

  if (name.length < 2) return 'Nama minimal 2 karakter.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format email tidak valid.';
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (password.length > 128) return 'Password terlalu panjang (maks 128 karakter).';
  if (password !== confirm) return 'Konfirmasi password tidak cocok.';
  return null;
}

// ============================================
// 1. REGISTER
// ============================================
export async function registerUser(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = (formData.get('name') as string) || '';
  const email = ((formData.get('email') as string) || '').trim().toLowerCase();
  const password = (formData.get('password') as string) || '';
  const confirm = (formData.get('confirm') as string) || '';

  const validationError = validateRegister({ name, email, password, confirm });
  if (validationError) {
    return { error: validationError };
  }

  try {
    // Cek email duplikat
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return { error: 'Email sudah terdaftar. Silakan login.' };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      name: name.trim(),
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Auto login setelah register
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });

    return { success: true };
  } catch (error) {
    // signIn melempar AuthError (redirect) — biarkan lolos
    if (error instanceof AuthError) {
      return { error: authErrorMessage(error, 'Registrasi gagal. Coba lagi.') };
    }
    // Next.js redirect error juga harus lolos
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error('Register error:', error);
    return { error: 'Terjadi kesalahan server. Coba lagi nanti.' };
  }
}

// ============================================
// 2. LOGIN
// ============================================
export async function loginUser(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = ((formData.get('email') as string) || '').trim().toLowerCase();
  const password = (formData.get('password') as string) || '';

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  if (isRateLimited(email)) {
    return {
      error: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
    };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
    clearAttempts(email);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: authErrorMessage(error) };
    }
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error; // redirect Next.js
    }
    console.error('Login error:', error);
    return { error: 'Terjadi kesalahan server. Coba lagi nanti.' };
  }
}

// ============================================
// 3. LOGOUT
// ============================================
export async function logout() {
  await signOut({ redirectTo: '/' });
}
