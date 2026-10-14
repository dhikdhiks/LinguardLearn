'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Volume2, Pencil, Trash2, PlusCircle } from 'lucide-react';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

interface Phrase {
  id: string;
  phrase: string;
  translation: string;
  phonetic: string | null;
  difficulty: string | null;
  isFavorite: boolean;
  isLearned: boolean;
  tags: string[];
  notes: string | null;
}

export default function PhrasesPage() {
  const router = useRouter();

  // Server-side pagination state
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'learned' | 'unlearned'>('all');
  const [favoriting, setFavoriting] = useState<Set<string>>(new Set());
  const [learning, setLearning] = useState<Set<string>>(new Set());

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build query params from filters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
    if (selectedDifficulties.length > 0) params.set('difficulty', selectedDifficulties.join(','));
    if (filterTag) params.set('tag', filterTag);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('limit', PAGE_SIZE.toString());
    // Saat mencari: urutkan relevansi (exact/prefix match dulu).
    params.set('sortBy', debouncedSearchTerm ? 'relevance' : 'phrase');
    params.set('sortOrder', debouncedSearchTerm ? 'desc' : 'asc');
    return params.toString();
  }, [debouncedSearchTerm, selectedDifficulties, filterTag, filterStatus]);

  // Fetch phrases from API with current filters
  const fetchPhrases = useCallback(async (offset = 0, append = false, signal?: AbortSignal) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = buildQueryParams();
      const url = `/api/phrases/search?${params}&offset=${offset}`;
      const res = await fetch(url, signal ? { signal } : undefined);
      const data = await res.json();

      if (append) {
        setPhrases((prev) => [...prev, ...data.data]);
      } else {
        setPhrases(data.data);
      }
      setTotalCount(data.total);
    } catch (error: any) {
      // Abort karena filter berubah → request lama dibatalkan, bukan error.
      if (error?.name === 'AbortError') return;
      console.error('Failed to fetch phrases:', error);
    } finally {
      // Jangan reset loading kalau request ini sudah dibatalkan
      // (ada request baru yang sedang berjalan).
      if (!signal?.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [buildQueryParams]);

  // Fetch when filters change; batalkan request lama yang masih berjalan
  // agar hasil tidak tertukar / diperlambat oleh request usang.
  useEffect(() => {
    const controller = new AbortController();
    fetchPhrases(0, false, controller.signal);
    return () => controller.abort();
  }, [fetchPhrases]);

  // Load more (pagination)
  const loadMore = useCallback(() => {
    fetchPhrases(phrases.length, true);
  }, [fetchPhrases, phrases.length]);

  // Get unique tags from loaded phrases (for filter dropdown)
  const allTags = [...new Set(phrases.flatMap((p) => p.tags || []))];

  // ============================================================
  // TOGGLE OPTIMISTIK: update UI dulu, PATCH di background.
  // TIDAK refetch seluruh API setiap klik → jauh lebih responsif.
  // ============================================================
  const toggleFavorite = async (id: string, current: boolean) => {
    const next = !current;
    setFavoriting((prev) => new Set(prev).add(id));
    // Optimistic update, tanpa refetch semua frasa
    setPhrases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: next } : p))
    );
    try {
      await fetch(`/api/phrases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: next }),
      });
    } catch {
      // Rollback jika gagal
      setPhrases((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFavorite: current } : p))
      );
    } finally {
      setFavoriting((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const toggleLearned = async (id: string, current: boolean) => {
    const next = !current;
    setLearning((prev) => new Set(prev).add(id));
    // Optimistic update, tanpa refetch semua frasa
    setPhrases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isLearned: next } : p))
    );
    try {
      await fetch(`/api/phrases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLearned: next }),
      });
    } catch {
      // Rollback jika gagal
      setPhrases((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isLearned: current } : p))
      );
    } finally {
      setLearning((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleDelete = async (id: string, phrase: string) => {
    if (!confirm(`Delete the phrase "${phrase}"?`)) return;
    await fetch(`/api/phrases/${id}`, { method: 'DELETE' });
    fetchPhrases(0, false);
  };

  const handleSpeak = (phrase: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleDifficulty = (diff: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💬 Everyday Phrases</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Showing {phrases.length} of {totalCount} phrases
            {loading && <span className="ml-2 opacity-70">loading...</span>}
          </p>
        </div>
        <button
          onClick={() => router.push('/phrases/add')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Add Phrase
        </button>
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search phrases or translations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            {/* Difficulty */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tingkat:</span>
              {['beginner', 'intermediate', 'advanced'].map((diff) => (
                <label
                  key={diff}
                  className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full transition cursor-pointer ${
                    selectedDifficulties.includes(diff)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDifficulties.includes(diff)}
                    onChange={() => toggleDifficulty(diff)}
                    className="form-checkbox h-3 w-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span>{diff}</span>
                </label>
              ))}
            </div>

            {/* Status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('unlearned')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filterStatus === 'unlearned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                📖 Not mastered
              </button>
              <button
                onClick={() => setFilterStatus('learned')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filterStatus === 'learned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                ✅ Mastered
              </button>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tag:</span>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">All</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GRID */}
      {loading && phrases.length === 0 ? (
        // Skeleton hanya di area grid → kotak search tetap tampil & fokus terjaga.
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : phrases.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No matching phrases.</p>
        </div>
      ) : (
        <>
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {phrases.map((p) => (
              <PhraseCard
                key={p.id}
                phrase={p}
                favoriting={favoriting}
                learning={learning}
                onToggleFavorite={toggleFavorite}
                onToggleLearned={toggleLearned}
                onDelete={handleDelete}
                onSpeak={handleSpeak}
              />
            ))}
          </div>

          {/* TOMBOL MUAT LEBIH BANYAK (PAGINATION) */}
          {phrases.length < totalCount && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                {loadingMore ? 'Loading...' : `Load More (${totalCount - phrases.length} more phrases)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Memoized PhraseCard - mencegah re-render tidak perlu saat filter/search
// ============================================================
interface PhraseCardProps {
  phrase: Phrase;
  favoriting: Set<string>;
  learning: Set<string>;
  onToggleFavorite: (id: string, current: boolean) => void;
  onToggleLearned: (id: string, current: boolean) => void;
  onDelete: (id: string, phrase: string) => void;
  onSpeak: (phrase: string) => void;
}

const PhraseCard = memo(function PhraseCard({
  phrase,
  favoriting,
  learning,
  onToggleFavorite,
  onToggleLearned,
  onDelete,
  onSpeak,
}: PhraseCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition group">
      {/* Header dengan tombol aksi */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {phrase.phrase}
            </h2>
            <button
              onClick={() => onSpeak(phrase.phrase)}
              className="p-1 text-gray-400 hover:text-blue-600 transition rounded-full hover:bg-blue-50 dark:hover:bg-blue-900"
              title="Hear"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
              {phrase.difficulty || 'beginner'}
            </span>
            {phrase.phonetic && <span className="text-xs text-gray-400 font-mono">{phrase.phonetic}</span>}
          </div>
          {phrase.tags && phrase.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {phrase.tags.map((tag) => (
                <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => onToggleFavorite(phrase.id, phrase.isFavorite)}
            disabled={favoriting.has(phrase.id)}
            className={`p-1.5 text-gray-400 hover:text-yellow-500 transition ${
              favoriting.has(phrase.id) ? 'opacity-40 cursor-wait' : ''
            }`}
            title={phrase.isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            {phrase.isFavorite ? '⭐' : '☆'}
          </button>
          <button
            onClick={() => onToggleLearned(phrase.id, phrase.isLearned)}
            disabled={learning.has(phrase.id)}
            className={`p-1.5 transition ${
              learning.has(phrase.id)
                ? 'opacity-40 cursor-wait'
                : phrase.isLearned
                ? 'text-green-500'
                : 'text-gray-400 hover:text-green-500'
            }`}
            title={phrase.isLearned ? 'Mark as not mastered' : 'Mark as mastered'}
          >
            {phrase.isLearned ? '✅' : '📖'}
          </button>
          <Link
            href={`/phrases/edit/${phrase.id}`}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(phrase.id, phrase.phrase)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Isi */}
      <div className="mt-3">
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-500 dark:text-gray-400">Meaning:</span> {phrase.translation}
        </p>
        {phrase.notes && (
          <div className="mt-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
            📝 {phrase.notes}
          </div>
        )}
      </div>
    </div>
  );
});