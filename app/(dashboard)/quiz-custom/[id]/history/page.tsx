'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, ChevronRight, History } from 'lucide-react';
import { Button, Card, Skeleton, Spinner } from '@heroui/react';

interface Attempt {
  id: string;
  setId: string;
  setName: string | null;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  durationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
}

export default function QuizCustomHistoryPage() {
  const params = useParams();
  const setId = params.id as string;

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/quiz-custom/attempts?setId=${setId}&limit=100`);
      const data = await res.json();
      setAttempts(data.data || []);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-2xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <Spinner size="lg" color="accent" />
            <p className="text-lg text-muted-foreground">Loading history…</p>
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} animationType="shimmer" className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-foreground">Failed to Load</h2>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Link href="/quiz-custom">
            <Button variant="primary">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/quiz-custom"
            className="mb-4 inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Quizzes
          </Link>

          <Card className="p-6">
            <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground">
              <History className="h-6 w-6 text-primary" />
              Quiz History
            </h1>
            <p className="text-muted-foreground">
              {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
            </p>
          </Card>
        </div>

        {attempts.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-muted" />
            <h2 className="mb-2 text-xl font-bold text-foreground">No History Yet</h2>
            <p className="mb-6 text-muted-foreground">
              Play this quiz to see your history here.
            </p>
            <Link href={`/quiz-custom/${setId}/play`}>
              <Button variant="primary" size="lg">
                Start Quiz
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {attempts.map((attempt) => (
                <Link
                  key={attempt.id}
                  href={`/quiz-custom/${setId}/result/${attempt.id}`}
                  className="flex items-center justify-between gap-4 p-6 transition hover:bg-accent/30"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold ${getScoreColor(attempt.score)}`}>
                      {attempt.score}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-3">
                        <span className="block truncate font-medium text-foreground">
                          {attempt.setName || 'Quiz'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(attempt.startedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{attempt.correctAnswers} / {attempt.totalQuestions} correct</span>
                        <span>{formatTime(attempt.durationSeconds)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
