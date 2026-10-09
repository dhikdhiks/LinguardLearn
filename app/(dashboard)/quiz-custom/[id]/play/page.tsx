'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Flag, Volume2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start quiz on mount
  useEffect(() => {
    startQuiz();
    // Timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startQuiz = async () => {
    try {
      const res = await fetch(`/api/quiz-custom/sets/${setId}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulai kuis');
      setQuiz(data);
      setCurrentQuestionStartTime(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kuis');
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

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;

    let finalAnswer = '';
    if (currentQuestion.isMultipleChoice) {
      finalAnswer = selectedOption || '';
    } else {
      finalAnswer = userInput;
    }

    if (!finalAnswer.trim()) {
      alert('Masukkan jawaban terlebih dahulu');
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

    setAnswers(prev => [...prev, newAnswer]);
    setShowResult(true);
  };

  const handleNext = () => {
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

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setUserInput('');
      setSelectedOption(null);
      setShowResult(false);
      setCurrentQuestionStartTime(Date.now());
    }
  };

  const finishQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch(`/api/quiz-custom/sets/${setId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          durationSeconds: elapsedTime,
          startedAt: quiz?.startedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan hasil');
      router.push(`/quiz-custom/${setId}/result/${data.attemptId}`);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Gagal menyimpan hasil kuis');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat kuis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gagal Memuat Kuis</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link href="/quiz-custom" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz || !currentQuestion) {
    return null;
  }

  const isMultipleChoice = currentQuestion.isMultipleChoice;
  const isCorrect = showResult ? checkAnswer(isMultipleChoice ? (selectedOption || '') : userInput) : false;
  const progress = ((currentIndex + 1) / quiz.totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/quiz-custom"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{quiz.setName}</h1>
            <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
              Soal {currentIndex + 1} / {quiz.totalQuestions}
            </span>
          </div>
          <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* QUESTION CARD */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 mb-6">
          {/* Question */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-1 rounded ${
                currentQuestion.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}>
                {currentQuestion.difficulty}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentQuestion.itemType === 'vocabulary' ? '📚 Kosakata' : '💬 Kalimat'}
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {getDisplayQuestion()}
            </div>
            {currentQuestion.phonetic && (
              <div className="text-lg text-gray-500 dark:text-gray-400 font-mono mb-2">
                /{currentQuestion.phonetic}/
              </div>
            )}
            {currentQuestion.isMultipleChoice && currentQuestion.options && (
              <div className="mt-4 space-y-2" role="radiogroup">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedOption(opt);
                      handleSubmitAnswer();
                    }}
                    disabled={showResult}
                    className={`w-full text-left p-4 rounded-xl border-2 transition ${
                      showResult
                        ? opt === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : opt === selectedOption
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'border-gray-200 dark:border-gray-700'
                        : selectedOption === opt
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        showResult
                          ? opt === currentQuestion.correctAnswer
                            ? 'border-green-500'
                            : opt === selectedOption
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                          : selectedOption === opt
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {showResult && opt === currentQuestion.correctAnswer && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {showResult && opt === selectedOption && !isCorrect && (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        {!showResult && selectedOption === opt && (
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="text-lg text-gray-900 dark:text-white">{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Answer Input (for type_in) */}
          {!isMultipleChoice && (
            <div className="space-y-4">
              {!showResult ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jawaban Anda
                  </label>
                  <input
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    placeholder={quiz.direction === 'target_to_source' ? 'Ketik dalam Bahasa Inggris...' : 'Ketik dalam Bahasa Indonesia...'}
                    className="w-full px-4 py-3 text-lg border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!userInput.trim()}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-xl transition shadow-sm"
                  >
                    Periksa Jawaban
                  </button>
                </div>
              ) : (
                <div className={`p-6 rounded-xl border-2 ${
                  isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {isCorrect ? (
                      <Check className="w-8 h-8 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-8 h-8 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-xl font-bold ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {isCorrect ? 'Benar! 🎉' : 'Salah'}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Jawaban yang benar: <span className="font-medium">{getDisplayAnswer()}</span>
                      </p>
                    </div>
                  </div>
                  {currentQuestion.sourceText !== currentQuestion.question && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Soal asli: {currentQuestion.sourceText} → {currentQuestion.targetText}
                    </p>
                  )}
                  <button
                    onClick={handleNext}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition shadow-sm"
                  >
                    {currentIndex === quiz.totalQuestions - 1 ? 'Selesai & Lihat Hasil' : 'Soal Berikutnya'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation for multiple choice when showing result */}
          {isMultipleChoice && showResult && (
            <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
              >
                {currentIndex === quiz.totalQuestions - 1 ? 'Selesai & Lihat Hasil' : 'Soal Berikutnya'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* PROGRESS INDICATOR */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800 dark:text-white">Progress</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {answers.filter(a => a.isCorrect).length} / {answers.length} benar
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {quiz.questions.map((q, i) => {
              const ans = answers[i];
              let color = 'bg-gray-200 dark:bg-gray-700';
              if (ans) {
                color = ans.isCorrect ? 'bg-green-500' : 'bg-red-500';
              } else if (i === currentIndex) {
                color = 'bg-blue-500';
              }
              return (
                <div
                  key={q.id}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all ${color}`}
                >
                  {ans ? (ans.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />) : (i + 1)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}