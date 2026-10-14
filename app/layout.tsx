import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import ParticleBackground from '@/components/ParticleBackground';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LinguaLearn — English Vocabulary & Quiz App',
  description:
    'A modern English vocabulary and quiz learning app. Build your word bank, master phrases, and test your vocabulary every day.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ParticleBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
