'use client';

import { useState } from 'react';

interface Phrase {
  id: string;
  phrase: string;
  translation: string;
  phonetic: string | null;
  difficulty: string | null;
}

export default function PhrasesSection({ phrases }: { phrases: Phrase[] }) {
  const [randomPhrases, setRandomPhrases] = useState<Phrase[]>(() => {
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  });

  const handleRefresh = () => {
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    setRandomPhrases(shuffled.slice(0, 10));
  };

  if (phrases.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">💬 Kalimat Sehari-hari</h2>
        <button
          onClick={handleRefresh}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {randomPhrases.map((p) => (
          <div key={p.id} className="border-b border-gray-100 pb-2">
            <div className="font-medium text-gray-800">{p.phrase}</div>
            <div className="text-sm text-gray-500">{p.translation}</div>
            {p.phonetic && <div className="text-xs text-gray-400 font-mono">{p.phonetic}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}