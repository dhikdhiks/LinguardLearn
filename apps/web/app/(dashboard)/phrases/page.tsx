'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Volume2, Pencil, Trash2, PlusCircle } from 'lucide-react';
import AnimatedList from '@/components/AnimatedList';
import AnimatedItem from '@/components/AnimatedItem';

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

  const [allPhrases, setAllPhrases] = useState<Phrase[]>([]);
  const [filteredPhrases, setFilteredPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'learned' | 'unlearned'>('all');

  const fetchPhrases = async () => {
    const res = await fetch('/api/phrases');
    const data = await res.json();
    setAllPhrases(data);
    setFilteredPhrases(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhrases();
  }, []);

  const toggleDifficulty = (diff: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    await fetch(`/api/phrases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: !current }),
    });
    fetchPhrases();
  };

  const toggleLearned = async (id: string, current: boolean) => {
    await fetch(`/api/phrases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLearned: !current }),
    });
    fetchPhrases();
  };

  const handleDelete = async (id: string, phrase: string) => {
    if (!confirm(`Hapus kalimat "${phrase}" dari daftar?`)) return;
    await fetch(`/api/phrases/${id}`, { method: 'DELETE' });
    fetchPhrases();
  };

  const handleSpeak = (phrase: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    let result = allPhrases;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.phrase.toLowerCase().includes(term) ||
          p.translation.toLowerCase().includes(term)
      );
    }

    if (selectedDifficulties.length > 0) {
      result = result.filter((p) => selectedDifficulties.includes(p.difficulty || ''));
    }

    if (filterTag) {
      result = result.filter((p) => p.tags && p.tags.includes(filterTag));
    }

    if (filterStatus === 'learned') {
      result = result.filter((p) => p.isLearned);
    } else if (filterStatus === 'unlearned') {
      result = result.filter((p) => !p.isLearned);
    }

// Sorting: yang belum dihafal di atas, yang sudah dihafal di bawah
result.sort((a, b) => {
  if (a.isLearned !== b.isLearned) {
    return a.isLearned ? 1 : -1;
  }
  // Jika status sama, urutkan berdasarkan phrase (A-Z)
  return a.phrase.localeCompare(b.phrase);
});

    setFilteredPhrases(result);
  }, [searchTerm, selectedDifficulties, filterTag, filterStatus, allPhrases]);

  if (loading) {
    return <div className="text-center py-12">⏳ Memuat data...</div>;
  }

  const allTags = [...new Set(allPhrases.flatMap((p) => p.tags || []))];

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💬 Kalimat Sehari-hari</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {filteredPhrases.length} dari {allPhrases.length} kalimat
          </p>
        </div>
        <button
          onClick={() => router.push('/phrases/add')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Tambah Kalimat
        </button>
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kalimat atau terjemahan..."
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
      {filteredPhrases.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-lg">Tidak ada kalimat yang cocok.</p>
        </div>
      ) : (
        <AnimatedList className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPhrases.map((p) => (
            <AnimatedItem key={p.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition group">
              {/* Header dengan tombol aksi */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {p.phrase}
                    </h2>
                    <button
                      onClick={() => handleSpeak(p.phrase)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition rounded-full hover:bg-blue-50 dark:hover:bg-blue-900"
                      title="Dengar"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                      {p.difficulty || 'beginner'}
                    </span>
                    {p.phonetic && <span className="text-xs text-gray-400 font-mono">{p.phonetic}</span>}
                  </div>
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => toggleFavorite(p.id, p.isFavorite)}
                    className="p-1.5 text-gray-400 hover:text-yellow-500 transition"
                    title={p.isFavorite ? 'Hapus favorit' : 'Tambah favorit'}
                  >
                    {p.isFavorite ? '⭐' : '☆'}
                  </button>
                  <button
                    onClick={() => toggleLearned(p.id, p.isLearned)}
                    className={`p-1.5 transition ${
                      p.isLearned ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
                    }`}
                    title={p.isLearned ? 'Tandai belum hafal' : 'Tandai sudah hafal'}
                  >
                    {p.isLearned ? '✅' : '📖'}
                  </button>
                  <Link
                    href={`/phrases/edit/${p.id}`}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.phrase)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Isi */}
              <div className="mt-3">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-500 dark:text-gray-400">Arti:</span> {p.translation}
                </p>
                {p.notes && (
                  <div className="mt-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                    📝 {p.notes}
                  </div>
                )}
              </div>
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}
    </div>
  );
}