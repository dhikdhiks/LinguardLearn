'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  Volume2,
  Pencil,
  Trash2,
  PlusCircle,
} from 'lucide-react';
// Jumlah kartu per halaman (pagination) - optimasi untuk UX
const PAGE_SIZE = 20;
const DEBOUNCE_MS = 250;

interface Word {
  id: string;
  word: string;
  translation: string;
  definition: string | null;
  partOfSpeech: string | null;
  difficulty: string | null;
  exampleSentence: string | null;
  phonetic: string | null;
  v1: string | null;
  v2: string | null;
  v3: string | null;
  v_ing: string | null;
  v_s: string | null;
  plural_form: string | null;
  synonyms: string[];
  antonyms: string[];
  notes: string | null;
  isFavorite: boolean;
  isLearned: boolean;
  tags: string[];
}

export default function VocabularyPage() {
  const router = useRouter();

  // Server-side pagination state
  const [words, setWords] = useState<Word[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
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
    if (selectedParts.length > 0) params.set('partOfSpeech', selectedParts.join(','));
    if (selectedDifficulties.length > 0) params.set('difficulty', selectedDifficulties.join(','));
    if (filterTag) params.set('tag', filterTag);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('limit', PAGE_SIZE.toString());
    params.set('sortBy', 'word');
    params.set('sortOrder', 'asc');
    return params.toString();
  }, [debouncedSearchTerm, selectedParts, selectedDifficulties, filterTag, filterStatus]);

  // Fetch words from API with current filters
  const fetchWords = useCallback(async (offset = 0, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = buildQueryParams();
      const url = `/api/vocabulary/search?${params}&offset=${offset}`;
      const res = await fetch(url);
      const data = await res.json();

      if (append) {
        setWords((prev) => [...prev, ...data.data]);
      } else {
        setWords(data.data);
      }
      setTotalCount(data.total);
    } catch (error) {
      console.error('Failed to fetch vocabulary:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQueryParams]);

  // Fetch when filters change
  useEffect(() => {
    fetchWords(0, false);
  }, [fetchWords]);

  // Load more (pagination)
  const loadMore = useCallback(() => {
    fetchWords(words.length, true);
  }, [fetchWords, words.length]);

  // Get unique tags from loaded words (for filter dropdown)
  const allTags = [...new Set(words.flatMap((w) => w.tags || []))];

  if (loading) {
    return <div className="text-center py-12">⏳ Memuat data...</div>;
  }

  // ============================================================
  // TOGGLE OPTIMISTIK: update UI dulu, PATCH di background.
  // TIDAK refetch seluruh API setiap klik → jauh lebih responsif.
  // ============================================================
  const toggleFavorite = async (id: string, current: boolean) => {
    const next = !current;
    setFavoriting((prev) => new Set(prev).add(id));
    // Optimistic update
    setWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isFavorite: next } : w))
    );
    try {
      await fetch(`/api/vocabulary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: next }),
      });
    } catch {
      // Rollback jika gagal
      setWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, isFavorite: current } : w))
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
    // Optimistic update
    setWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isLearned: next } : w))
    );
    try {
      await fetch(`/api/vocabulary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLearned: next }),
      });
    } catch {
      // Rollback jika gagal
      setWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, isLearned: current } : w))
      );
    } finally {
      setLearning((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleDelete = async (id: string, word: string) => {
    if (!confirm(`Hapus kata "${word}" dari kamus?`)) return;
    await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
    fetchWords(0, false);
  };

  const handleSpeak = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const togglePart = (part: string) => {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📚 Kamus Saya</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Menampilkan {words.length} dari {totalCount} kata
          </p>
        </div>
        <button
          onClick={() => router.push('/vocabulary/add')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Tambah Kata
        </button>
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kata, arti, atau definisi..."
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
            {/* Part of Speech */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis:</span>
              {['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection'].map(
                (part) => (
                  <label
                    key={part}
                    className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full transition cursor-pointer ${
                      selectedParts.includes(part)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParts.includes(part)}
                      onChange={() => togglePart(part)}
                      className="form-checkbox h-3 w-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span>{part}</span>
                  </label>
                )
              )}
            </div>

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
                Semua
              </button>
              <button
                onClick={() => setFilterStatus('unlearned')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filterStatus === 'unlearned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                📖 Belum
              </button>
              <button
                onClick={() => setFilterStatus('learned')}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filterStatus === 'learned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                ✅ Sudah
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
                  <option value="">Semua</option>
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
      {words.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Tidak ada kata yang cocok.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {words.map((word) => (
              <VocabularyCard
                key={word.id}
                word={word}
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
          {words.length < totalCount && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                {loadingMore ? 'Memuat...' : `Muat Lebih Banyak (${totalCount - words.length} kata lagi)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Memoized VocabularyCard - mencegah re-render tidak perlu saat filter/search
// ============================================================
interface VocabularyCardProps {
  word: Word;
  favoriting: Set<string>;
  learning: Set<string>;
  onToggleFavorite: (id: string, current: boolean) => void;
  onToggleLearned: (id: string, current: boolean) => void;
  onDelete: (id: string, word: string) => void;
  onSpeak: (word: string) => void;
}

const VocabularyCard = memo(function VocabularyCard({
  word,
  favoriting,
  learning,
  onToggleFavorite,
  onToggleLearned,
  onDelete,
  onSpeak,
}: VocabularyCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition group">
      {/* Header dengan tombol aksi */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {word.word}
            </h2>
            <button
              onClick={() => onSpeak(word.word)}
              className="p-1 text-gray-400 hover:text-blue-600 transition rounded-full hover:bg-blue-50 dark:hover:bg-blue-900"
              title="Dengar"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
              {word.partOfSpeech || '-'}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                word.difficulty === 'beginner'
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : word.difficulty === 'intermediate'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                  : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
              }`}
            >
              {word.difficulty || 'beginner'}
            </span>
            {word.phonetic && <span className="text-xs text-gray-400 font-mono">{word.phonetic}</span>}
          </div>
          {word.tags && word.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {word.tags.map((tag) => (
                <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => onToggleFavorite(word.id, word.isFavorite)}
            disabled={favoriting.has(word.id)}
            className={`p-1.5 text-gray-400 hover:text-yellow-500 transition ${
              favoriting.has(word.id) ? 'opacity-40 cursor-wait' : ''
            }`}
            title={word.isFavorite ? 'Hapus favorit' : 'Tambah favorit'}
          >
            {word.isFavorite ? '⭐' : '☆'}
          </button>
          <button
            onClick={() => onToggleLearned(word.id, word.isLearned)}
            disabled={learning.has(word.id)}
            className={`p-1.5 transition ${
              learning.has(word.id)
                ? 'opacity-40 cursor-wait'
                : word.isLearned
                ? 'text-green-500'
                : 'text-gray-400 hover:text-green-500'
            }`}
            title={word.isLearned ? 'Tandai belum hafal' : 'Tandai sudah hafal'}
          >
            {word.isLearned ? '✅' : '📖'}
          </button>
          <Link
            href={`/vocabulary/edit/${word.id}`}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(word.id, word.word)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Isi */}
      <div className="mt-3 space-y-1">
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-500 dark:text-gray-400">Arti:</span> {word.translation}
        </p>
        {word.definition && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-500 dark:text-gray-400">Definisi:</span> {word.definition}
          </p>
        )}
        {word.exampleSentence && (
          <p className="text-sm text-gray-500 italic mt-1">"{word.exampleSentence}"</p>
        )}
      </div>

      {/* Verb forms */}
      {(word.v1 || word.v2 || word.v3 || word.v_ing || word.v_s) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
          <span className="font-medium text-gray-500 dark:text-gray-400">Verb:</span>
          {word.v1 && <span><span className="text-gray-400">V1</span> {word.v1}</span>}
          {word.v2 && <span><span className="text-gray-400">V2</span> {word.v2}</span>}
          {word.v3 && <span><span className="text-gray-400">V3</span> {word.v3}</span>}
          {word.v_ing && <span><span className="text-gray-400">-ing</span> {word.v_ing}</span>}
          {word.v_s && <span><span className="text-gray-400">-s</span> {word.v_s}</span>}
        </div>
      )}
      {word.plural_form && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-500 dark:text-gray-400">Plural:</span> {word.plural_form}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {word.synonyms && word.synonyms.length > 0 && (
          <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
            Syn: {word.synonyms.join(', ')}
          </span>
        )}
        {word.antonyms && word.antonyms.length > 0 && (
          <span className="bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded">
            Ant: {word.antonyms.join(', ')}
          </span>
        )}
      </div>
      {word.notes && (
        <div className="mt-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
          📝 {word.notes}
        </div>
      )}
    </div>
  );
});