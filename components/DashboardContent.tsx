'use client';

import Link from 'next/link';
import {
  BookOpen,
  Brain,
  MessageSquare,
  PlusCircle,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button, Card, ProgressBar } from '@heroui/react';
import FocusWords from '@/components/FocusWords';
import PhrasesSection from '@/components/PhrasesSection';

interface Stats {
  total: number;
  learned: number;
  unlearned: number;
  favorite: number;
  percentage: number;
}

interface RandomWord {
  id: string;
  word: string;
  translation: string | null;
  phonetic: string | null;
  definition: string | null;
}

interface PhraseItem {
  id: string;
  phrase: string;
  translation: string | null;
  phonetic: string | null;
  difficulty: string | null;
  isFavorite: boolean;
  isLearned: boolean;
}

export default function DashboardContent({
  userName,
  vocabStats,
  phraseStats,
  randomWord,
  unlearnedPhrasesList,
}: {
  userName: string;
  vocabStats: Stats;
  phraseStats: Stats;
  randomWord: RandomWord | null;
  unlearnedPhrasesList: PhraseItem[];
}) {
  return (
    <div>
      {/* Welcome */}
      <Card className="glow-antigravity mb-6 border-0 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/85">Welcome back, {userName}!</p>
      </Card>

      {/* Vocabulary Mastery */}
      <Card className="mb-4 p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Vocabulary Mastery
          </h2>
          <span className="text-sm font-medium text-muted-foreground">
            {vocabStats.percentage}% ({vocabStats.learned} of {vocabStats.total} words)
          </span>
        </div>
        <ProgressBar value={vocabStats.percentage} color="accent" size="md">
          <ProgressBar.Track />
          <ProgressBar.Fill />
        </ProgressBar>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div>Total: {vocabStats.total}</div>
          <div className="text-green-600 dark:text-green-400">Mastered: {vocabStats.learned}</div>
          <div className="text-yellow-600 dark:text-yellow-400">Remaining: {vocabStats.unlearned}</div>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-3 w-3" /> {vocabStats.favorite}
          </div>
        </div>
      </Card>

      {/* Phrases Mastery */}
      <Card className="mb-6 p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            Phrase Mastery
          </h2>
          <span className="text-sm font-medium text-muted-foreground">
            {phraseStats.percentage}% ({phraseStats.learned} of {phraseStats.total} phrases)
          </span>
        </div>
        <ProgressBar value={phraseStats.percentage} color="accent" size="md">
          <ProgressBar.Track />
          <ProgressBar.Fill />
        </ProgressBar>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div>Total: {phraseStats.total}</div>
          <div className="text-green-600 dark:text-green-400">Mastered: {phraseStats.learned}</div>
          <div className="text-yellow-600 dark:text-yellow-400">Remaining: {phraseStats.unlearned}</div>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-3 w-3" /> {phraseStats.favorite}
          </div>
        </div>
      </Card>

      {/* Word of the Day */}
      {randomWord && (
        <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 shadow-sm dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Word of the Day
            </span>
          </p>
          <div className="mt-1 flex items-center gap-4">
            <span className="text-2xl font-bold text-purple-800 dark:text-purple-300">
              {randomWord.word}
            </span>
            <span className="text-sm text-purple-600 dark:text-purple-300">
              {randomWord.translation}
            </span>
            {randomWord.phonetic && (
              <span className="font-mono text-xs text-purple-400">{randomWord.phonetic}</span>
            )}
          </div>
          {randomWord.definition && (
            <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">{randomWord.definition}</p>
          )}
          <Link
            href={`/vocabulary/edit/${randomWord.id}`}
            className="mt-2 inline-block text-xs text-purple-500 hover:underline"
          >
            View details →
          </Link>
        </Card>
      )}

      {/* Focus Words - only words not yet mastered */}
      <FocusWords />

      {/* Random Phrases Section - only phrases not yet mastered */}
      <PhrasesSection phrases={unlearnedPhrasesList} />

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/vocabulary/add">
          <Button variant="primary">
            <PlusCircle className="mr-1 h-4 w-4" /> Add Word
          </Button>
        </Link>
        <Link href="/phrases/add">
          <Button variant="secondary">
            <PlusCircle className="mr-1 h-4 w-4" /> Add Phrase
          </Button>
        </Link>
        <Link href="/vocabulary">
          <Button variant="outline">
            <BookOpen className="mr-1 h-4 w-4" /> Dictionary
          </Button>
        </Link>
        <Link href="/phrases">
          <Button variant="outline">
            <MessageSquare className="mr-1 h-4 w-4" /> Phrases
          </Button>
        </Link>
        <Link href="/quiz-custom">
          <Button variant="primary">
            <Brain className="mr-1 h-4 w-4" /> Take a Quiz
          </Button>
        </Link>
      </div>
    </div>
  );
}
