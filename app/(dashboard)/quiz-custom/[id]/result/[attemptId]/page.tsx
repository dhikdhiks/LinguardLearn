'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, Trophy, Clock, RefreshCw, Calendar, Eye, EyeOff } from 'lucide-react';
import { Button, Card, Chip, ProgressCircle, Skeleton, Spinner } from '@heroui/react';

interface AttemptDetail {
  id: string;
  setId: string;
  setName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  durationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
  answers: Array<{
    itemId: string;
    itemType: 'vocabulary' | 'phrases';
    question: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentMs: number;
  }>;
}

export default function QuizCustomResultPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const setId = params.id as string;

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Review: default hanya tampilkan jawaban salah
  const [showOnlyWrong, setShowOnlyWrong] = useState(true);

  useEffect(() => {
    loadResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const loadResult = async () => {
    try {
      const res = await fetch(`/api/quiz-custom/attempts?setId=${setId}&limit=100`);
      const data = await res.json();
      const found = data.data.find((a: any) => a.id === attemptId);
      if (found) {
        setAttempt(found);
      } else {
        setError('Quiz result not found');
      }
    } catch (err) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMs = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-2xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <Spinner size="lg" color="accent" />
            <p className="text-lg text-muted-foreground">Loading results…</p>
          </div>
          <div className="space-y-4">
            <Skeleton animationType="shimmer" className="h-12 w-48" />
            <Skeleton animationType="pulse" className="h-6 w-full" />
            <Skeleton animationType="pulse" className="h-6 w-5/6" />
            <Skeleton animationType="pulse" className="h-6 w-2/3" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-foreground">Result Not Found</h2>
          <p className="mb-6 text-muted-foreground">{error || 'No data available'}</p>
          <Link href="/quiz-custom">
            <Button variant="primary">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const percentage = attempt.totalQuestions > 0
    ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
    : 0;

  const scoreColor = percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger';

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

          <Card className="p-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Trophy className={`h-10 w-10 ${
                percentage >= 80 ? 'text-yellow-500' : percentage >= 50 ? 'text-blue-500' : 'text-muted-foreground'
              }`} />
              <h1 className="text-3xl font-bold text-foreground">{attempt.setName}</h1>
            </div>

            <div className="mb-4 flex justify-center">
              <ProgressCircle value={percentage} color={scoreColor} size="lg">
                <span className="text-2xl font-bold">{percentage}%</span>
              </ProgressCircle>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl bg-accent/50 p-3">
                <p className="text-muted-foreground">Correct</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{attempt.correctAnswers}</p>
              </div>
              <div className="rounded-xl bg-accent/50 p-3">
                <p className="text-muted-foreground">Wrong</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{attempt.wrongAnswers}</p>
              </div>
              <div className="rounded-xl bg-accent/50 p-3">
                <p className="text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{attempt.totalQuestions}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(attempt.durationSeconds)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(attempt.startedAt)}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="primary" onPress={() => router.push(`/quiz-custom/${setId}/play`)}>
                <RefreshCw className="mr-1 h-4 w-4" /> Play Again
              </Button>
              <Link href={`/quiz-custom/${setId}/history`}>
                <Button variant="outline">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Quiz History
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* DETAILED ANSWERS */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6">
            <h2 className="text-xl font-bold text-foreground">
              Answer Review
              {showOnlyWrong && attempt.wrongAnswers > 0 && (
                <span className="ml-2 text-sm font-normal text-red-500">
                  ({attempt.answers.filter(a => !a.isCorrect).length} wrong)
                </span>
              )}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setShowOnlyWrong(prev => !prev)}
            >
              {showOnlyWrong ? <Eye className="mr-1 h-4 w-4" /> : <EyeOff className="mr-1 h-4 w-4" />}
              {showOnlyWrong ? 'Show all' : 'Wrong only'}
            </Button>
          </div>

          {!showOnlyWrong && attempt.answers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No answer details.</p>
          ) : showOnlyWrong && attempt.answers.length > 0 && attempt.answers.every(a => a.isCorrect) ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <p className="mb-2 text-2xl">🎉</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                All answers correct!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing left to review.
              </p>
            </motion.div>
          ) : (
            <div className="divide-y divide-border">
              {attempt.answers
                .filter(a => !showOnlyWrong || !a.isCorrect)
                .map((answer, index) => (
                <motion.div
                  key={answer.itemId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="p-6 transition hover:bg-accent/30"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Question {index + 1}
                        </span>
                        <Chip size="sm" color={answer.isCorrect ? 'success' : 'danger'} variant="soft">
                          <Chip.Label className="flex items-center gap-1">
                            {answer.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {answer.isCorrect ? 'Correct' : 'Wrong'}
                          </Chip.Label>
                        </Chip>
                        <span className="text-xs text-muted-foreground">
                          {formatMs(answer.timeSpentMs)}
                        </span>
                      </div>
                      <p className="text-lg font-medium text-foreground">
                        {answer.question}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                      <div className="mb-1 flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Correct Answer</span>
                      </div>
                      <p className="text-lg font-medium text-green-800 dark:text-green-200">
                        {answer.correctAnswer}
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                      <div className="mb-1 flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Your Answer</span>
                      </div>
                      <p className={`text-lg font-medium ${answer.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                        {answer.userAnswer || '(empty)'}
                      </p>
                    </div>
                  </div>
                </motion.div>
                ))}
            </div>
          )}
        </Card>

        {/* ACTION BUTTONS */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onPress={() => router.push(`/quiz-custom/${setId}/play`)}>
            <RefreshCw className="mr-1 h-4 w-4" /> Play Again
          </Button>
          <Link href={`/quiz-custom/${setId}/history`}>
            <Button variant="outline">
              <ArrowLeft className="mr-1 h-4 w-4" /> Quiz History
            </Button>
          </Link>
          <Link href="/quiz-custom">
            <Button variant="outline">
              <ArrowLeft className="mr-1 h-4 w-4" /> All Quizzes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
