import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db, users } from 'db';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
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

    async session({ session, token }) {
      if (!session.user || !token.email) {
        return session;
      }

      try {
        // Cari user berdasarkan email
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, token.email))
          .limit(1);

        let userId = token.sub;

        if (existingUser.length > 0) {
          // User sudah ada → pakai ID dari database
          userId = existingUser[0].id;
          console.log(`✅ User found by email: ${token.email}, ID: ${userId}`);
        } else {
          // User belum ada → buat baru dengan ID dari Google
          await db.insert(users).values({
            id: token.sub!,
            email: token.email,
            name: token.name || session.user.name || 'User',
            avatarUrl: token.picture || session.user.image || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          userId = token.sub!;
          console.log(`✅ User created: ${token.email}, ID: ${userId}`);
        }

        // Set ID session ke ID yang benar (dari database)
        session.user.id = userId;
      } catch (error) {
        console.error('❌ Error in session callback:', error);
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});