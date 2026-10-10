'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2, Play, Clock, Trophy, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';

interface QuizSet {
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
}

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

export default function QuizCustomListPage() {
  const router = useRouter();
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [loadingAttempts, setLoadingAttempts] = useState<Set<string>>(new Set());

  const fetchSets = async () => {
    try {
      const res = await fetch('/api/quiz-custom/sets');
      const data = await res.json();
      setSets(data);
    } catch (error) {
      console.error('Failed to fetch quiz sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async (setId: string) => {
    setLoadingAttempts(prev => new Set(prev).add(setId));
    try {
      const res = await fetch(`/api/quiz-custom/attempts?setId=${setId}&limit=5`);
      const data = await res.json();
      setAttempts(prev => ({ ...prev, [setId]: data.data }));
    } catch (error) {
      console.error('Failed to fetch attempts:', error);
    } finally {
      setLoadingAttempts(prev => {
        const s = new Set(prev);
        s.delete(setId);
        return s;
      });
    }
  };

  const toggleExpand = (setId: string) => {
    if (expandedId === setId) {
      setExpandedId(null);
    } else {
      setExpandedId(setId);
      if (!attempts[setId]) fetchAttempts(setId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kuis ini? Semua soal dan riwayat akan terhapus.')) return;
    try {
      await fetch(`/api/quiz-custom/sets/${id}`, { method: 'DELETE' });
      setSets(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Gagal menghapus kuis');
    }
  };

  const handleShare = async (id: string) => {
    const url = `${window.location.origin}/quiz-custom/${id}/play`;
    try {
      await navigator.clipboard.writeText(url);
      alert('🔗 Link kuis berhasil disalin! Bagikan ke teman Anda.');
    } catch (err) {
      alert('Gagal menyalin link kuis');
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  if (loading) {
    return <div className="text-center py-12">⏳ Memuat daftar kuis...</div>;
  }

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🧪 Kuis Custom</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Buat kuis sendiri dari kata/kalimat yang kamu pilih. Cocok untuk hafalan targets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/quiz-custom/browse"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            🌐 JELAJAH KUIS PUBLIK
          </Link>
          <Link
            href="/quiz-custom/create"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Buat Kuis Baru
          </Link>
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">Belum ada kuis custom.</p>
          <Link
            href="/quiz-custom/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <PlusCircle className="w-4 h-4" /> Buat Kuis Pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sets.map((quiz) => (
            <div key={quiz.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Quiz Card Header */}
              <button
                onClick={() => toggleExpand(quiz.id)}
                className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{quiz.name}</h2>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                      {getContentTypeLabel(quiz.contentType)}
                    </span>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                      {getDirectionLabel(quiz.direction)}
                    </span>
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                      {getQuestionTypeLabel(quiz.questionType)}
                    </span>
                    {quiz.isPublic && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                        🌐 Publik
                      </span>
                    )}
                  </div>
                  {quiz.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{quiz.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Dibuat: {formatDate(quiz.createdAt)}</span>
                    <span>Diupdate: {formatDate(quiz.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/quiz-custom/${quiz.id}/play`}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    <Play className="w-4 h-4" /> Mulai
                  </Link>
                  <Link
                    href={`/quiz-custom/create?edit=${quiz.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(quiz.id); }}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded transition"
                    title="Salin link kuis"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(quiz.id); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(quiz.id); }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    {expandedId === quiz.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </button>

              {/* Expanded: Recent Attempts */}
              {expandedId === quiz.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-800 dark:text-white">📊 Riwayat Terbaru</h3>
                    <Link
                      href={`/quiz-custom/${quiz.id}/history`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Lihat semua
                    </Link>
                  </div>
                  {loadingAttempts.has(quiz.id) ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">Memuat riwayat...</div>
                  ) : attempts[quiz.id]?.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">Belum ada riwayat main.</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {attempts[quiz.id]?.slice(0, 5).map((attempt) => (
                        <div key={attempt.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              attempt.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              attempt.score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {attempt.score}%
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800 dark:text-white">
                                {attempt.correctAnswers} / {attempt.totalQuestions} benar
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(attempt.startedAt)} • {formatDuration(attempt.durationSeconds)}
                              </div>
                            </div>
                          </div>
                          <Link
                            href={`/quiz-custom/${quiz.id}/result/${attempt.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Detail
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}