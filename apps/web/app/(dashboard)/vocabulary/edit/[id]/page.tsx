'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditVocabularyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    word: '',
    translation: '',
    definition: '',
    partOfSpeech: '',
    difficulty: 'beginner',
    exampleSentence: '',
    phonetic: '',
    v1: '',
    v2: '',
    v3: '',
    v_ing: '',
    v_s: '',
    plural_form: '',
    synonyms: '',
    antonyms: '',
    tags: '',        // <-- TAMBAHKAN TAGS
    notes: '',
  });

  useEffect(() => {
    if (!id) {
      setError('ID tidak valid');
      setLoading(false);
      return;
    }

    fetch(`/api/vocabulary/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        setForm({
          word: data.word || '',
          translation: data.translation || '',
          definition: data.definition || '',
          partOfSpeech: data.partOfSpeech || '',
          difficulty: data.difficulty || 'beginner',
          exampleSentence: data.exampleSentence || '',
          phonetic: data.phonetic || '',
          v1: data.v1 || '',
          v2: data.v2 || '',
          v3: data.v3 || '',
          v_ing: data.v_ing || '',
          v_s: data.v_s || '',
          plural_form: data.plural_form || '',
          synonyms: data.synonyms?.join(', ') || '',
          antonyms: data.antonyms?.join(', ') || '',
          tags: data.tags?.join(', ') || '',      // <-- TAGS DARI DATABASE
          notes: data.notes || '',
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Gagal memuat data');
        setLoading(false);
      });
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const synonymsArray = form.synonyms.split(',').map(s => s.trim()).filter(Boolean);
    const antonymsArray = form.antonyms.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      ...form,
      tags: tagsArray,
      synonyms: synonymsArray,
      antonyms: antonymsArray,
    };

    try {
      const res = await fetch(`/api/vocabulary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan perubahan');
        setSaving(false);
        return;
      }

      router.push('/vocabulary');
    } catch {
      setError('Terjadi kesalahan');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">⏳ Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/vocabulary')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Kamus
      </button>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">✏️ Edit Kata</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ubah informasi kata di kamus Anda.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Word */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kata *</label>
            <input
              type="text"
              name="word"
              required
              value={form.word}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Translation + Part of Speech */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Terjemahan *</label>
              <input
                type="text"
                name="translation"
                required
                value={form.translation}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Kata *</label>
              <select
                name="partOfSpeech"
                required
                value={form.partOfSpeech}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Pilih...</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
                <option value="pronoun">Pronoun</option>
                <option value="preposition">Preposition</option>
                <option value="conjunction">Conjunction</option>
                <option value="interjection">Interjection</option>
              </select>
            </div>
          </div>

          {/* Phonetic + Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phonetic</label>
              <input
                type="text"
                name="phonetic"
                value={form.phonetic}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
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
          </div>

          {/* Definition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Definisi</label>
            <textarea
              name="definition"
              rows={2}
              value={form.definition}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Example Sentence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contoh Kalimat</label>
            <input
              type="text"
              name="exampleSentence"
              value={form.exampleSentence}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Verb Forms (conditional) */}
          {(form.partOfSpeech === 'verb' || form.partOfSpeech === '') && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">🔤 Verb Forms</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {['v1', 'v2', 'v3', 'v_ing', 'v_s'].map((field) => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase">{field}</label>
                    <input
                      type="text"
                      name={field}
                      value={form[field as keyof typeof form] as string}
                      onChange={handleChange}
                      className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Noun Forms (conditional) */}
          {(form.partOfSpeech === 'noun' || form.partOfSpeech === '') && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📦 Noun Forms</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase">Plural</label>
                  <input
                    type="text"
                    name="plural_form"
                    value={form.plural_form}
                    onChange={handleChange}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Synonyms & Antonyms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sinonim</label>
              <input
                type="text"
                name="synonyms"
                value={form.synonyms}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="pisah koma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Antonim</label>
              <input
                type="text"
                name="antonyms"
                value={form.antonyms}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="pisah koma"
              />
            </div>
          </div>

          {/* TAGS - TAMBAHKAN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag / Kategori</label>
            <input
              type="text"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="pisah koma: Travel, Business, Technology"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catatan</label>
            <textarea
              name="notes"
              rows={2}
              value={form.notes}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  );
}