import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

// Middleware memakai config tanpa provider/DB → aman di Edge runtime
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/vocabulary') ||
    pathname.startsWith('/phrases') ||
    pathname.startsWith('/quiz');

  const isAuthPage = pathname === '/login' || pathname === '/register';

  // Belum login + akses halaman terproteksi → redirect ke login
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah login + akses login/register → redirect ke dashboard
  if (isLoggedIn && isAuthPage) {
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/vocabulary/:path*',
    '/phrases/:path*',
    '/quiz/:path*',
    '/login',
    '/register',
  ],
};
