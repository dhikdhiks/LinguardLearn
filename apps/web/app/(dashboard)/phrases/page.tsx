'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Volume2, Pencil, Trash2, PlusCircle } from 'lucide-react';

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
    setSelectedDifficulties(prev =>
      prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
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
        p =>
          p.phrase.toLowerCase().includes(term) ||
          p.translation.toLowerCase().includes(term)
      );
    }
    if (selectedDifficulties.length > 0) {
      result = result.filter(p => selectedDifficulties.includes(p.difficulty || ''));
    }
    if (filterTag) {
      result = result.filter(p => p.tags && p.tags.includes(filterTag));
    }
    setFilteredPhrases(result);
  }, [searchTerm, selectedDifficulties, filterTag, allPhrases]);

  if (loading) return <div className="text-center py-12">⏳ Memuat...</div>;

  const allTags = [...new Set(allPhrases.flatMap(p => p.tags || []))];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">💬 Kalimat Sehari-hari</h1>
          <p className="text-gray-500 text-sm">{filteredPhrases.length} dari {allPhrases.length} kalimat</p>
        </div>
        <button
          onClick={() => router.push('/phrases/add')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <PlusCircle className="w-4 h-4" /> Tambah Kalimat
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kalimat atau terjemahan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700 mr-2">Tingkat:</span>
              {['beginner', 'intermediate', 'advanced'].map(diff => (
                <label key={diff} className="inline-flex items-center mr-2">
                  <input
                    type="checkbox"
                    checked={selectedDifficulties.includes(diff)}
                    onChange={() => toggleDifficulty(diff)}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-1 text-sm text-gray-700">{diff}</span>
                </label>
              ))}
            </div>
            {allTags.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700 mr-2">Tag:</span>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Semua</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredPhrases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500 text-lg">Tidak ada kalimat yang cocok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPhrases.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">{p.phrase}</h2>
                    <button
                      onClick={() => handleSpeak(p.phrase)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {p.difficulty || 'beginner'}
                    </span>
                    {p.phonetic && <span className="text-xs text-gray-400 font-mono">{p.phonetic}</span>}
                  </div>
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.tags.map(tag => <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">#{tag}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={() => toggleFavorite(p.id, p.isFavorite)} className="p-1.5 text-gray-400 hover:text-yellow-500">
                    {p.isFavorite ? '⭐' : '☆'}
                  </button>
                  <button onClick={() => toggleLearned(p.id, p.isLearned)} className={`p-1.5 transition ${p.isLearned ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}>
                    {p.isLearned ? '✅' : '📖'}
                  </button>
                  <Link href={`/phrases/edit/${p.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 transition">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(p.id, p.phrase)} className="p-1.5 text-gray-400 hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-gray-700">{p.translation}</p>
                {p.notes && <p className="text-xs text-gray-400 mt-1 border-t border-gray-100 pt-1">📝 {p.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}