import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes
  const publicPaths = ['/', '/login', '/register'];
  const isPublicPath = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Auth routes (guest only)
  const authPaths = ['/login', '/register'];
  const isAuthPath = authPaths.includes(pathname);

  if (isLoggedIn && isAuthPath) {
    return Response.redirect(new URL('/dashboard', req.nextUrl));
  }

  if (!isLoggedIn && !isPublicPath) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};