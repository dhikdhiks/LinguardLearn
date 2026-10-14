'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, AlertCircle } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  Input,
  ProgressBar,
  Radio,
  RadioGroup,
  Skeleton,
  Spinner,
} from '@heroui/react';

interface QuizQuestion {
  id: string;
  index: number;
  itemType: 'vocabulary' | 'phrases';
  itemId: string;
  question: string;
  correctAnswer: string;
  sourceText: string;
  targetText: string;
  phonetic: string | null;
  difficulty: string | null;
  isLearned: boolean;
  isFavorite: boolean;
  isMultipleChoice?: boolean;
  options?: string[];
}

interface QuizData {
  setId: string;
  setName: string;
  direction: 'source_to_target' | 'target_to_source' | 'mixed';
  questionType: 'type_in' | 'multiple_choice' | 'mixed';
  totalQuestions: number;
  questions: QuizQuestion[];
  startedAt: string;
}

interface UserAnswer {
  itemId: string;
  itemType: 'vocabulary' | 'phrases';
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
}

/**
 * Multiple Choice Only rule:
 * Vocabulary items whose meaning contains a comma represent multiple
 * meanings (e.g. "change" -> "mengubah, ganti") and must never be
 * presented as typed-input questions. The server already flags these
 * as `isMultipleChoice`; this helper re-checks the raw answer as a
 * defense-in-depth guard so a typed input can never be rendered or
 * submitted for such items, regardless of how the payload was built.
 */
const isMultipleChoiceOnly = (q: QuizQuestion): boolean =>
  q.isMultipleChoice === true ||
  (q.itemType === 'vocabulary' && q.correctAnswer.includes(','));

export default function QuizCustomPlayPage() {
  const router = useRouter();
  const params = useParams();
  const setId = params.id as string;

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  // Ref agar auto-next (setTimeout) selalu baca data terbaru
  // (menghindari stale closure saat finishQuiz membaca answers)
  const answersRef = useRef<UserAnswer[]>([]);
  const elapsedRef = useRef(0);

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Auto-next setelah menjawab (feedback ±1.2 detik, lalu lanjut otomatis)
  const autoNextRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoNext = useCallback(() => {
    if (autoNextRef.current) {
      clearTimeout(autoNextRef.current);
      autoNextRef.current = null;
    }
  }, []);

  // Start quiz on mount
  useEffect(() => {
    startQuiz();
    // Timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => {
        elapsedRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearAutoNext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startQuiz = async () => {
    try {
      const res = await fetch(`/api/quiz-custom/sets/${setId}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start quiz');
      setQuiz(data);
      setCurrentQuestionStartTime(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = quiz?.questions[currentIndex];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDisplayQuestion = () => {
    if (!currentQuestion) return '';
    return currentQuestion.question;
  };

  const getDisplayAnswer = () => {
    if (!currentQuestion) return '';
    return currentQuestion.correctAnswer;
  };

  const checkAnswer = (userAns: string): boolean => {
    if (!currentQuestion) return false;
    const correct = currentQuestion.correctAnswer.trim().toLowerCase();
    const user = userAns.trim().toLowerCase();
    return user === correct;
  };

  const handleSubmitAnswer = (submittedAnswer?: string) => {
    if (!currentQuestion) return;

    const mcOnly = isMultipleChoiceOnly(currentQuestion);

    // Multiple Choice Only items can never be graded from typed input.
    let finalAnswer = '';
    if (mcOnly) {
      finalAnswer = submittedAnswer ?? (selectedOption || '');
    } else {
      finalAnswer = submittedAnswer ?? userInput;
    }

    if (!finalAnswer.trim()) {
      return;
    }

    const timeSpent = Date.now() - currentQuestionStartTime;
    const isCorrect = checkAnswer(finalAnswer);

    const newAnswer: UserAnswer = {
      itemId: currentQuestion.itemId,
      itemType: currentQuestion.itemType,
      question: currentQuestion.question,
      correctAnswer: currentQuestion.correctAnswer,
      userAnswer: finalAnswer,
      isCorrect,
      timeSpentMs: timeSpent,
    };

    answersRef.current = [...answersRef.current, newAnswer];
    setAnswers(answersRef.current);
    setShowResult(true);

    // Otomatis lanjut ke soal berikutnya setelah ±1.2 detik
    clearAutoNext();
    autoNextRef.current = setTimeout(() => {
      handleNext();
    }, 1200);
  };

  const handleNext = () => {
    clearAutoNext();
    if (currentIndex < (quiz?.totalQuestions ?? 0) - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setSelectedOption(null);
      setShowResult(false);
      setCurrentQuestionStartTime(Date.now());
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch(`/api/quiz-custom/sets/${setId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersRef.current,
          durationSeconds: elapsedRef.current,
          startedAt: quiz?.startedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save results');
      router.push(`/quiz-custom/${setId}/result/${data.attemptId}`);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to save quiz results');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showResult) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Spinner size="lg" color="accent" />
            <p className="text-lg text-muted-foreground">Loading quiz…</p>
          </div>
          <div className="space-y-4">
            <Skeleton animationType="shimmer" className="h-10 w-3/4" />
            <Skeleton animationType="shimmer" className="h-6 w-1/2" />
            <div className="pt-2 space-y-2">
              <Skeleton animationType="pulse" className="h-14 w-full" />
              <Skeleton animationType="pulse" className="h-14 w-full" />
              <Skeleton animationType="pulse" className="h-14 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-foreground">Failed to Load Quiz</h2>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Link href="/quiz-custom">
            <Button variant="primary">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quizzes
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!quiz || !currentQuestion || finished) {
    return null;
  }

  const mcOnly = isMultipleChoiceOnly(currentQuestion);
  // Multiple Choice Only items always need options. The API generates them,
  // but fall back to a single (correct) option so a typed input is never shown.
  const mcOptions = currentQuestion.options ?? [currentQuestion.correctAnswer];
  const isCorrect = showResult ? checkAnswer(mcOnly ? (selectedOption || '') : userInput) : false;
  const progress = ((currentIndex + 1) / quiz.totalQuestions) * 100;

  // Progress indicator: window maksimal 10 nomor (1-10, 11-20, ...)
  const WINDOW_SIZE = 10;
  const windowStart = Math.floor(currentIndex / WINDOW_SIZE) * WINDOW_SIZE;
  const windowEnd = Math.min(windowStart + WINDOW_SIZE, quiz.totalQuestions);
  const visibleQuestions = quiz.questions.slice(windowStart, windowEnd);

  const difficultyColor =
    currentQuestion.difficulty === 'beginner'
      ? 'success'
      : currentQuestion.difficulty === 'intermediate'
        ? 'warning'
        : 'danger';

  const correctCount = answers.filter(a => a.isCorrect).length;

  return (
    <div className="py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/quiz-custom"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              aria-label="Back to quizzes"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold text-foreground">{quiz.setName}</h1>
            <Chip size="sm" variant="soft" color="accent">
              <Chip.Label>
                Question {currentIndex + 1} / {quiz.totalQuestions}
              </Chip.Label>
            </Chip>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress} color="accent" size="md">
              <ProgressBar.Track />
              <ProgressBar.Fill />
            </ProgressBar>
          </div>
        </div>

        {/* QUESTION CARD */}
        <Card className="mb-6 p-8">
          {/* Question */}
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Chip size="sm" color={difficultyColor} variant="soft">
                <Chip.Label className="capitalize">{currentQuestion.difficulty}</Chip.Label>
              </Chip>
              <Chip size="sm" variant="soft">
                <Chip.Label>
                  {currentQuestion.itemType === 'vocabulary' ? 'Vocabulary' : 'Phrase'}
                </Chip.Label>
              </Chip>
              {mcOnly && (
                <Chip size="sm" variant="secondary">
                  <Chip.Label>Multiple Choice Only</Chip.Label>
                </Chip>
              )}
            </div>
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-2 text-3xl font-bold text-foreground"
            >
              {getDisplayQuestion()}
            </motion.div>
            {currentQuestion.phonetic && (
              <div className="mb-2 font-mono text-lg text-muted-foreground">
                /{currentQuestion.phonetic}/
              </div>
            )}
            {mcOnly && (
              <div className="mt-4 space-y-2" role="radiogroup">
                <RadioGroup
                  value={selectedOption ?? ''}
                  onChange={value => {
                    if (showResult) return;
                    setSelectedOption(value);
                    handleSubmitAnswer(value);
                  }}
                  isDisabled={showResult}
                  className="space-y-2"
                >
                  {mcOptions.map(opt => {
                    const isCorrectOption = opt === currentQuestion.correctAnswer;
                    const isChosen = opt === selectedOption;
                    return (
                      <Radio key={opt} value={opt} className="w-full">
                        <Radio.Content
                          className={({ isSelected }) =>
                            `flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                              showResult
                                ? isCorrectOption
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                  : isChosen && !isCorrect
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                    : 'border-border'
                                : isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-border hover:border-blue-400 dark:hover:border-blue-700'
                            }`
                          }
                        >
                          <Radio.Control
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                              showResult
                                ? isCorrectOption
                                  ? 'border-green-500'
                                  : isChosen && !isCorrect
                                    ? 'border-red-500'
                                    : 'border-border'
                                : ''
                            }`}
                          >
                            <Radio.Indicator>
                              {showResult && isCorrectOption && (
                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                              {showResult && isChosen && !isCorrect && (
                                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                              )}
                            </Radio.Indicator>
                          </Radio.Control>
                          <span className="text-lg text-foreground">{opt}</span>
                        </Radio.Content>
                      </Radio>
                    );
                  })}
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Answer Input (type-in only — never rendered for Multiple Choice Only items) */}
          {!mcOnly && (
            <div className="space-y-4">
              {!showResult ? (
                <div>
                  <Input
                    aria-label="Your Answer"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    placeholder={
                      quiz.direction === 'target_to_source'
                        ? 'Type in English…'
                        : 'Type in Indonesian…'
                    }
                    fullWidth
                  />
                  <Button
                    className="mt-2 w-full"
                    variant="primary"
                    size="lg"
                    onClick={() => handleSubmitAnswer()}
                    isDisabled={!userInput.trim()}
                  >
                    Check Answer
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-xl border-2 p-6 ${
                    isCorrect
                      ? 'border-green-500/50 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500/50 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    {isCorrect ? (
                      <Check className="h-8 w-8 shrink-0 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-8 w-8 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p
                        className={`text-xl font-bold ${
                          isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}
                      >
                        {isCorrect ? 'Correct!' : 'Not quite'}
                      </p>
                      <p className="text-muted-foreground">
                        Correct answer:{' '}
                        <span className="font-medium text-foreground">{getDisplayAnswer()}</span>
                      </p>
                    </div>
                  </div>
                  {currentQuestion.sourceText !== currentQuestion.question && (
                    <p className="text-sm text-muted-foreground">
                      Original question: {currentQuestion.sourceText} → {currentQuestion.targetText}
                    </p>
                  )}
                  <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                    <Spinner size="sm" color="accent" />
                    Moving to the next question…
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Auto-advance notice for multiple choice */}
          {mcOnly && showResult && (
            <div className="border-t border-border pt-4 text-center">
              <span className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Spinner size="sm" color="accent" />
                Moving to the next question…
              </span>
            </div>
          )}
        </Card>

        {/* PROGRESS INDICATOR */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-foreground">Progress</h3>
            <span className="text-sm text-muted-foreground">
              {correctCount} / {answers.length} correct
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {visibleQuestions.map((q, i) => {
              const idx = windowStart + i;
              const ans = answers[idx];
              let color = 'bg-muted';
              if (ans) {
                color = ans.isCorrect ? 'bg-green-500' : 'bg-red-500';
              } else if (idx === currentIndex) {
                color = 'bg-blue-500';
              }
              return (
                <div
                  key={q.id}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white transition-all ${color}`}
                >
                  {ans ? (ans.isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />) : idx + 1}
                </div>
              );
            })}
          </div>
          {quiz.totalQuestions > WINDOW_SIZE && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing questions {windowStart + 1}–{windowEnd} of {quiz.totalQuestions}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
