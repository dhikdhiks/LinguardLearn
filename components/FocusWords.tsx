'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Word {
  id: string;
  word: string;
  translation: string;
  partOfSpeech: string | null;
  difficulty: string | null;
}

// Skeleton component untuk loading state
function WordSkeleton() {
  return (
    <div className="flex justify-between items-center border-b border-gray-100 pb-2 animate-pulse">
      <div className="space-y-1">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export default function FocusWords() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRandomWords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vocabulary/random?limit=10');
      const data = await res.json();
      setWords(data);
    } catch (error) {
      console.error('Failed to fetch random words', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomWords();
  }, []);

  const handleRefresh = () => {
    fetchRandomWords();
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">🔥 Fokus Belajar (Belum Dihafal)</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      {loading ? (
        // Skeleton loading - 5 baris
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <WordSkeleton key={i} />
          ))}
        </div>
      ) : words.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">🎉 Semua kata sudah dihafal! Tambah kata baru.</p>
      ) : (
        <div className="space-y-2">
          {words.map((word) => (
            <div key={word.id} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
              <div>
                <span className="font-medium text-gray-800 dark:text-white">{word.word}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{word.translation}</span>
                <span className="text-xs text-gray-400 ml-2">{word.partOfSpeech}</span>
                <span className="text-xs text-gray-400 ml-2">{word.difficulty}</span>
              </div>
              <button
                onClick={() => router.push(`/vocabulary/edit/${word.id}`)}
                className="text-xs text-blue-500 hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}