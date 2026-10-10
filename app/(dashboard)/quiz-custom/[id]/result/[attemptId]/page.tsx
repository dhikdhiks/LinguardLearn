'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Trophy, Clock, RefreshCw, Share2, Download } from 'lucide-react';

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

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      const res = await fetch(`/api/quiz-custom/attempts?setId=${setId}&limit=100`);
      const data = await res.json();
      const found = data.data.find((a: any) => a.id === attemptId);
      if (found) {
        setAttempt(found);
      } else {
        setError('Hasil kuis tidak ditemukan');
      }
    } catch (err) {
      setError('Gagal memuat hasil');
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
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMs = (ms: number) => {
    return `${(ms / 1000).toFixed(1)} detik`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat hasil...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hasil Tidak Ditemukan</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Data tidak tersedia'}</p>
          <Link href="/quiz-custom" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  const percentage = attempt.totalQuestions > 0
    ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/quiz-custom"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Kuis
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className={`w-10 h-10 ${getScoreColor(percentage)}`} />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{attempt.setName}</h1>
            </div>

            <div className={`inline-block px-8 py-3 rounded-full ${getScoreBg(percentage)} ${getScoreColor(percentage)} mb-4`}>
              <span className="text-3xl font-bold">{percentage}%</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm mb-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400">Benar</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{attempt.correctAnswers}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400">Salah</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{attempt.wrongAnswers}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attempt.totalQuestions}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(attempt.durationSeconds)}
              </span>
              <span className="flex items-center gap-1">
                <span>📅</span>
                {formatDate(attempt.startedAt)}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button
                onClick={() => router.push(`/quiz-custom/${setId}/play`)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
              >
                <RefreshCw className="w-4 h-4" /> Main Lagi
              </button>
              <Link
                href={`/quiz-custom/${setId}/history`}
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg font-medium transition"
              >
                <ArrowLeft className="w-4 h-4" /> Riwayat Kuis
              </Link>
            </div>
          </div>
        </div>

        {/* DETAILED ANSWERS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detail Jawaban</h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {attempt.answers.map((answer, index) => (
              <div key={answer.itemId} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Soal {index + 1}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        answer.isCorrect
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {answer.isCorrect ? '✅ Benar' : '❌ Salah'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatMs(answer.timeSpentMs)}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      {answer.question}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Jawaban Benar</span>
                    </div>
                    <p className="text-lg font-medium text-green-800 dark:text-green-200">
                      {answer.correctAnswer}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-1">
                      <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">Jawaban Anda</span>
                    </div>
                    <p className={`text-lg font-medium ${answer.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {answer.userAnswer || '(kosong)'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => router.push(`/quiz-custom/${setId}/play`)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
          >
            <RefreshCw className="w-4 h-4" /> Main Lagi
          </button>
          <Link
            href={`/quiz-custom/${setId}/history`}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" /> Riwayat Kuis
          </Link>
          <Link
            href="/quiz-custom"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" /> Daftar Kuis
          </Link>
        </div>
      </div>
    </div>
  );
}