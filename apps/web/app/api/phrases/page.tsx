'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Volume2 } from 'lucide-react';

interface Phrase {
  id: string;
  english: string;
  indonesian: string;
  pronunciation: string | null;
  category: string;
}

export default function PhrasesPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhrases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/phrases/random');
      const data = await res.json();
      setPhrases(data);
    } catch (error) {
      console.error('Error fetching phrases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhrases();
  }, []);

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return <div className="text-center py-12">⏳ Memuat kalimat...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💬 Kalimat Sehari-hari</h1>
        <button
          onClick={fetchPhrases}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {phrases.map((phrase) => (
          <div key={phrase.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{phrase.english}</p>
                <p className="text-gray-600 dark:text-gray-300">{phrase.indonesian}</p>
                {phrase.pronunciation && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">{phrase.pronunciation}</p>
                )}
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded mt-1 inline-block">{phrase.category}</span>
              </div>
              <button
                onClick={() => handleSpeak(phrase.english)}
                className="p-2 text-gray-400 hover:text-blue-600 transition rounded-full hover:bg-blue-50"
                title="Dengar pengucapan"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}