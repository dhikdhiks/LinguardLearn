import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth';
import LoginForm from './login-form';

// Peta kode error NextAuth → pesan Indonesia yang mudah dipahami.
// Kode ini juga muncul via ?error=... saat alur Google gagal.
const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    'Gagal masuk: konfigurasi server belum lengkap (AUTH_SECRET / DATABASE_URL belum diatur di server).',
  MissingSecret:
    'Gagal masuk: AUTH_SECRET belum diatur di server.',
  AccessDenied: 'Akses login ditolak. Coba lagi.',
  OAuthSignin: 'Gagal memulai login Google. Coba lagi.',
  OAuthCallback: 'Gagal menyelesaikan login Google. Coba lagi.',
  OAuthCreateAccount: 'Gagal membuat akun Google. Coba lagi.',
  EmailCreateAccount: 'Gagal membuat akun. Coba lagi.',
  CallbackRouteError: 'Terjadi masalah saat login Google. Coba lagi.',
  OAuthAccountNotLinked:
    'Email Google ini sudah terhubung dengan akun lain. Gunakan metode login yang sesuai.',
  CredentialsSignin: 'Email atau password salah.',
};

function getErrorMessage(code?: string): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] || 'Login gagal. Coba lagi.';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const externalError = getErrorMessage(error);
  const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Selamat Datang Kembali</h2>
          <p className="mt-2 text-sm text-gray-600">
            Belum punya akun?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Daftar di sini
            </Link>
          </p>
        </div>

        {/* ============================================ */}
        {/* TOMBOL LOGIN DENGAN GOOGLE (jika dikonfigurasi) */}
        {/* ============================================ */}
        {googleEnabled && (
          <>
            <form
              action={async () => {
                'use server';
                try {
                  await signIn('google', { redirectTo: '/dashboard' });
                } catch (err) {
                  // Redirect sukses dari signIn dilempar sebagai error ber-"digest"
                  if (err && typeof err === 'object' && 'digest' in err) {
                    throw err;
                  }
                  const code =
                    err instanceof AuthError
                      ? (err as AuthError & { code?: string }).code ||
                        (err as AuthError & { type?: string }).type ||
                        'Unknown'
                      : 'Unknown';
                  redirect(`/login?error=${encodeURIComponent(code)}`);
                }
              }}
            >
              <Button
                type="submit"
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                Login dengan Google
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">atau</span>
              </div>
            </div>
          </>
        )}

        {/* Form email/password — client component dengan server action */}
        <LoginForm externalError={externalError} />
      </div>
    </div>
  );
}