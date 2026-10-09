'use client';

import { useState, useEffect } from 'react';

interface Phrase {
  id: string;
  phrase: string;
  translation: string;
  phonetic: string | null;
  difficulty: string | null;
}

function PhraseSkeleton() {
  return (
    <div className="border-b border-gray-100 dark:border-gray-700 pb-2 animate-pulse">
      <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export default function PhrasesSection({ phrases }: { phrases: Phrase[] }) {
  const [randomPhrases, setRandomPhrases] = useState<Phrase[]>(() =>
    phrases.slice(0, 10)
  );
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    // Shuffle di timeout biar UI responsive
    setTimeout(() => {
      const shuffled = [...phrases].sort(() => Math.random() - 0.5);
      setRandomPhrases(shuffled.slice(0, 10));
      setLoading(false);
    }, 0);
  };

  if (phrases.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">💬 Kalimat Sehari-hari</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <PhraseSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {randomPhrases.map((p) => (
            <div key={p.id} className="border-b border-gray-100 dark:border-gray-700 pb-2">
              <div className="font-medium text-gray-800 dark:text-white">{p.phrase}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{p.translation}</div>
              {p.phonetic && <div className="text-xs text-gray-400 font-mono">{p.phonetic}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}