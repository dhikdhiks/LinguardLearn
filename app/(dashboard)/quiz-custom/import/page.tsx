'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Database,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface ImportResult {
  success: boolean;
  setId: string;
  name: string;
  imported: number;
  skipped: string[];
  failed: string[];
}

export default function ImportQuizPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [verbCount, setVerbCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hitung jumlah verb & total kata di kamus
  useEffect(() => {
    (async () => {
      try {
        const [verbsRes, allRes] = await Promise.all([
          fetch('/api/vocabulary/search?partOfSpeech=verb&limit=1'),
          fetch('/api/vocabulary/search?limit=1'),
        ]);
        const [verbsData, allData] = await Promise.all([verbsRes.json(), allRes.json()]);
        setVerbCount(typeof verbsData.total === 'number' ? verbsData.total : null);
        setTotalCount(typeof allData.total === 'number' ? allData.total : null);
      } catch {
        setVerbCount(null);
        setTotalCount(null);
      }
    })();
  }, []);

  const runImport = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/quiz-custom/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, name: name.trim() || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Import failed');
    }
    return data;
  };

  const handleImportText = async () => {
    if (!text.trim() || loading || dbLoading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const words = [...new Set(text.split('\n').map((w) => w.trim()).filter(Boolean))];
      const data = await runImport({ mode: 'text', words });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  };

  const handleImportAll = async (pos: 'verb' | 'all') => {
    if (loading || dbLoading) return;
    setDbLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await runImport({ mode: 'database', pos });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred during import');
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/quiz-custom')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Quizzes
      </button>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          📥 Import Questions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Import quiz questions from any English words — all parts of speech
          are accepted (verb, noun, adjective, etc.). Each import automatically
          creates a new quiz.
        </p>

        {/* Quiz name (optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quiz Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Verbs"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* ===== IMPORT DARI TEKS ===== */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            1. Import from Text
          </h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
            placeholder="run&#10;apple&#10;quickly&#10;beautiful"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            One word per line. Words not yet in your dictionary will be
            fetched automatically from the dictionary API.
          </p>
          <button
            onClick={handleImportText}
            disabled={loading || dbLoading || !text.trim()}
            className="mt-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Import & Create Quiz'}
          </button>
        </div>

        <hr className="my-6 border-gray-200 dark:border-gray-700" />

        {/* ===== IMPORT DARI KAMUS ===== */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            2. Fetch from Dictionary
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount !== null
              ? `There are ${totalCount} words in your dictionary (${verbCount ?? '-'} of them verbs).`
              : 'Fetch words already stored in your dictionary.'}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              onClick={() => handleImportAll('verb')}
              disabled={loading || dbLoading}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {dbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              All Verbs{verbCount !== null ? ` (${verbCount})` : ''}
            </button>
            <button
              onClick={() => handleImportAll('all')}
              disabled={loading || dbLoading}
              className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {dbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              All Words{totalCount !== null ? ` (${totalCount})` : ''}
            </button>
          </div>
        </div>

        {/* ===== ERROR ===== */}
        {error && (
          <div className="mt-6 p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* ===== HASIL ===== */}
        {result && (
          <div className="mt-6 p-4 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20">
            <p className="font-medium text-gray-900 dark:text-white">
              ✅ Quiz "{result.name}" created — {result.imported} questions
            </p>
            <div className="mt-3">
              <button
                onClick={() => router.push(`/quiz-custom/${result.setId}/play`)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                <ExternalLink className="w-4 h-4" /> Play Quiz
              </button>
            </div>

            {result.skipped.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  ⚠️ Skipped: {result.skipped.length}
                </p>
                <ul className="text-sm text-yellow-600 dark:text-yellow-500 list-disc ml-5 max-h-40 overflow-y-auto">
                  {result.skipped.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.failed.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  ❌ Failed: {result.failed.length}
                </p>
                <ul className="text-sm text-red-600 dark:text-red-500 list-disc ml-5 max-h-40 overflow-y-auto">
                  {result.failed.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
