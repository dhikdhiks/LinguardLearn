'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Users, BookOpen, MessageSquare, Hash, TrendingUp } from 'lucide-react';

interface PublicQuiz {
  id: string;
  name: string;
  description: string | null;
  contentType: 'vocabulary' | 'phrases' | 'mixed';
  direction: 'source_to_target' | 'target_to_source' | 'mixed';
  questionType: 'type_in' | 'multiple_choice' | 'mixed';
  questionsPerSession: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  creatorName: string;
  playedCount: number;
}

export default function BrowsePublicQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [myCreatedCount, setMyCreatedCount] = useState(0);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchQuizzes = async (pageToFetch: number, append = false) => {
    if (loadingMore) return;
    if (append && !hasMore) return;

    setLoadingMore(true);
    try {
      const offset = (pageToFetch - 1) * PAGE_SIZE;
      const res = await fetch(`/api/quiz-custom/sets/public?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat kuis publik');

      if (append) {
        setQuizzes((prev) => [...prev, ...data.data]);
      } else {
        setQuizzes(data.data);
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
      setPage(pageToFetch);
    } catch (error) {
      console.error('Failed to fetch public quizzes:', error);
      if (!append) {
        alert('Gagal memuat kuis publik. Silakan coba lagi.');
      }
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchQuizzes(1);
  }, []);

  const loadMore = () => {
    fetchQuizzes(page + 1, true);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'vocabulary': return <BookOpen className="w-4 h-4" />;
      case 'phrases': return <MessageSquare className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'vocabulary': return '📚 Kosakata';
      case 'phrases': return '💬 Kalimat';
      case 'mixed': return '🔀 Campuran';
      default: return type;
    }
  };

  const getDirectionLabel = (dir: string) => {
    switch (dir) {
      case 'source_to_target': return 'EN → ID';
      case 'target_to_source': return 'ID → EN';
      case 'mixed': return 'Campur';
      default: return dir;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'type_in': return '⌨️ Input Manual';
      case 'multiple_choice': return '☑️ Pilihan Ganda';
      case 'mixed': return '🔀 Campur';
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/quiz-custom"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Kuis
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              🌍 JELAJAH KUIS PUBLIK
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Temukan kuis buatan member lain yang sudah dipublikasikan. Klik "Mulai" untuk langsung mengerjakan!
            </p>
          </div>
        </div>

        {loading && quizzes.length === 0 ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat kuis publik...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Belum Ada Kuis Publik</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Saat ini belum ada kuis yang dipublikasikan oleh member lain.
            </p>
            <Link
              href="/quiz-custom/create"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
            >
              ➕ Buat Kuis & Publikasikan
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                            {quiz.name}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            🌐 Publik
                          </span>
                        </div>
                        {quiz.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {quiz.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            {getContentTypeIcon(quiz.contentType)}
                            <span>{getContentTypeLabel(quiz.contentType)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <span className="w-4 h-4 flex items-center justify-center">↔️</span>
                            <span>{getDirectionLabel(quiz.direction)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <span className="w-4 h-4 flex items-center justify-center">❓</span>
                            <span>{getQuestionTypeLabel(quiz.questionType)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <TrendingUp className="w-4 h-4" />
                            <span>{formatCount(quiz.playedCount)} kali dimainkan</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <span className="w-4 h-4 flex items-center justify-center">👤</span>
                            <span>
                              {quiz.creatorName === 'Anda' ? 'Dibuat oleh Anda' : `Dibuat oleh ${quiz.creatorName}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <span className="w-4 h-4 flex items-center justify-center">📅</span>
                            <span>{formatDate(quiz.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Link
                          href={`/quiz-custom/${quiz.id}/play`}
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-sm"
                        >
                          <Play className="w-4 h-4" />
                          Mulai
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Muat Lebih Banyak'
                  )}
                </button>
              </div>
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Menampilkan {quizzes.length} dari {total} kuis publik
            </p>
          </>
        )}
      </div>
    </div>
  );
}
