import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { authConfig } from '@/lib/auth.config';

const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Google hanya dimuat jika dikonfigurasi — mencegah error saat env kosong
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);

        if (user.length === 0 || !user[0].passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user[0].passwordHash);
        if (!isValid) {
          return null;
        }

        const u = user[0];
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Auto-create user Google saat first sign-in (sekali saja, bukan tiap request)
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const existing = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (existing.length === 0) {
            const newId = user.id || crypto.randomUUID();
            await db.insert(users).values({
              id: newId,
              email: user.email,
              name: user.name || 'User',
              avatarUrl: user.image || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            user.id = newId;
          } else {
            // Pakai ID dari database agar konsisten
            user.id = existing[0].id;
          }
        } catch (error) {
          console.error('Error upserting Google user:', error);
        }
      }
      return true;
    },
  },
});
