'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Trophy, ChevronRight } from 'lucide-react';

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
  const router = useRouter();
  const params = useParams();
  const setId = params.id as string;

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttempts();
  }, [setId]);

  const loadAttempts = async () => {
    try {
      const res = await fetch(`/api/quiz-custom/attempts?setId=${setId}&limit=50`);
      const data = await res.json();
      setAttempts(data.data || []);
    } catch (err) {
      setError('Gagal memuat riwayat');
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
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat riwayat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gagal Memuat</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link href="/quiz-custom" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <Link
            href={`/quiz-custom/${setId}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Kuis
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">📊 Riwayat Kuis</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {attempts.length} kali main
            </p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Belum Ada Riwayat</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Mulai mainkan kuis ini untuk melihat riwayat di sini.</p>
            <Link
              href={`/quiz-custom/${setId}/play`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
            >
              Mulai Kuis
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {attempts.map((attempt) => (
                <Link
                  key={attempt.id}
                  href={`/quiz-custom/${setId}/result/${attempt.id}`}
                  className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${getScoreColor(attempt.score)}`}>
                      {attempt.score}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white truncate block">
                          {attempt.setName || 'Kuis'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(attempt.startedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{attempt.correctAnswers} / {attempt.totalQuestions} benar</span>
                        <span>{formatTime(attempt.durationSeconds)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}