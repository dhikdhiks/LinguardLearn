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
function authErrorMessage(error: unknown, fallback = 'Incorrect email or password.'): string {
  if (error instanceof AuthError) {
    const code =
      (error as AuthError & { code?: string }).code ||
      (error as AuthError & { type?: string }).type ||
      '';
    // AUTH_SECRET / DATABASE_URL not set on the server (e.g. Vercel)
    if (code === 'configuration' || error.name === 'MissingSecret') {
      return 'Server configuration is incomplete (AUTH_SECRET / DATABASE_URL not set). Please try again later.';
    }
    return fallback;
  }
  return 'Server error. Please try again later.';
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

  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long (max 128 characters).';
  if (password !== confirm) return 'Passwords do not match.';
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
      return { error: 'This email is already registered. Please sign in.' };
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
      return { error: authErrorMessage(error, 'Registration failed. Please try again.') };
    }
    // Next.js redirect error juga harus lolos
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error('Register error:', error);
    return { error: 'Server error. Please try again later.' };
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
    return { error: 'Email and password are required.' };
  }

  if (isRateLimited(email)) {
    return {
      error: 'Too many failed attempts. Please try again in 15 minutes.',
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
    return { error: 'Server error. Please try again later.' };
  }
}

// ============================================
// 3. LOGOUT
// ============================================
export async function logout() {
  await signOut({ redirectTo: '/' });
}
