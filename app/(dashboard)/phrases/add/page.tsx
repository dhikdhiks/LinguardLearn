'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Search, Volume2 } from 'lucide-react';
import { Spinner } from '@heroui/react';

export default function AddPhrasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    phrase: '',
    translation: '',
    phonetic: '',
    difficulty: 'beginner',
    tags: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ============================================================
  // AUTO-FILL: Cari Terjemahan
  // ============================================================
  const handleAutoFill = async () => {
    if (!form.phrase.trim()) {
      setError('Please enter a phrase first!');
      return;
    }

    setFetching(true);
    setError('');

    try {
      const res = await fetch(`/api/phrases/translate?phrase=${encodeURIComponent(form.phrase)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Translation failed');
        setFetching(false);
        return;
      }

      setForm((prev) => ({
        ...prev,
        translation: data.translation || '',
        // phonetic tidak diisi otomatis, user isi manual
      }));

      if (!data.translation) {
        setError('⚠️ Translation not found, please fill in manually.');
      }
    } catch {
      setError('Translation error occurred');
    } finally {
      setFetching(false);
    }
  };

  // ============================================================
  // TEXT-TO-SPEECH (Dengar pengucapan)
  // ============================================================
  const handleSpeak = () => {
    if (!form.phrase.trim()) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(form.phrase);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { ...form, tags: tagsArray };

    try {
      const res = await fetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Save failed');
        setLoading(false);
        return;
      }
      router.push('/phrases');
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.push('/phrases')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">➕ Add Phrase</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter a phrase, then click <strong>"🔍 Search"</strong> for automatic translation.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phrase + Auto-fill + Speak */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phrase *
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                name="phrase"
                required
                value={form.phrase}
                onChange={handleChange}
                onBlur={() => { if (form.phrase.trim() && !form.translation.trim()) handleAutoFill(); }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="How are you?"
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={fetching}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-1"
              >
                {fetching ? <Spinner size="sm" color="current" /> : <Search className="w-4 h-4" />}
                {fetching ? 'Loading...' : 'Search'}
              </button>
              <button
                type="button"
                onClick={handleSpeak}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-1"
                title="Hear pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Translation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Translation *
            </label>
            <input
              type="text"
              name="translation"
              required
              value={form.translation}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Apa kabar?"
            />
          </div>

          {/* Phonetic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phonetic (Pronunciation)
            </label>
            <input
              type="text"
              name="phonetic"
              value={form.phonetic}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="/haʊ ɑːr juː/"
            />
            <p className="text-xs text-gray-400 mt-1">💡 Fill it in manually, or use the 🔊 button to hear it.</p>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tingkat</label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag (pisah koma)</label>
            <input
              type="text"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="conversation, formal"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              name="notes"
              rows={2}
              value={form.notes}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}