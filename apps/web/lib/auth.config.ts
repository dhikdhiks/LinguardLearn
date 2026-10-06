import type { NextAuthConfig } from 'next-auth';

/**
 * Config auth TANPA import database — aman dipakai di middleware (Edge runtime).
 * Provider & logic DB hanya ditambahkan di lib/auth.ts (Node runtime).
 */
export const authConfig = {
  // Provider sebenarnya ditambahkan di lib/auth.ts (Node runtime);
  // di middleware cukup array kosong untuk validasi config
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    // Session callback murni mapping token → session (TANPA query DB)
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
