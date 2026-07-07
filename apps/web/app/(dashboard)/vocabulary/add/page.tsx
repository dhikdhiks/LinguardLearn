'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Save, Loader2 } from 'lucide-react';

export default function AddVocabularyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
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
    tags: '',        // <-- TAMBAHKAN
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAutoFill = async () => {
    if (!form.word.trim()) {
      setError('Masukkan kata terlebih dahulu!');
      return;
    }
    setFetching(true);
    setError('');
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(form.word)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal mengambil data');
        setFetching(false);
        return;
      }
      setForm(prev => ({
        ...prev,
        word: data.word || prev.word,
        translation: data.translation || '',
        definition: data.definition || '',
        partOfSpeech: data.partOfSpeech || '',
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
      }));
      if (!data.translation) {
        setError('⚠️ Terjemahan tidak ditemukan, isi manual.');
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'tags') {
        formData.append(key, JSON.stringify(tagsArray));
      } else {
        formData.append(key, value);
      }
    });

    try {
      const res = await fetch('/api/add-word', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan');
        setLoading(false);
        return;
      }
      router.push('/vocabulary');
    } catch {
      setError('Terjadi kesalahan');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/vocabulary')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Kamus
      </button>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📝 Tambah Kata Baru</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Masukkan kata, lalu klik "Cari" untuk isi otomatis.</p>
        {error && <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">⚠️ {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input type="text" name="word" required value={form.word} onChange={handleChange} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="contoh: beautiful" />
            <button type="button" onClick={handleAutoFill} disabled={fetching} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2">
              {fetching ? '⏳' : <Search className="w-4 h-4" />} {fetching ? 'Memuat...' : 'Cari'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Terjemahan *</label><input type="text" name="translation" required value={form.translation} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="artinya..." /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Kata *</label><select name="partOfSpeech" required value={form.partOfSpeech} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"><option value="">Pilih...</option><option value="noun">Noun</option><option value="verb">Verb</option><option value="adjective">Adjective</option><option value="adverb">Adverb</option><option value="pronoun">Pronoun</option><option value="preposition">Preposition</option><option value="conjunction">Conjunction</option><option value="interjection">Interjection</option></select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phonetic</label><input type="text" name="phonetic" value={form.phonetic} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="/bjuːtɪfəl/" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tingkat</label><select name="difficulty" value={form.difficulty} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Definisi</label><textarea name="definition" rows={2} value={form.definition} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="extremely pleasing..." /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contoh Kalimat</label><input type="text" name="exampleSentence" value={form.exampleSentence} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="She looked beautiful..." /></div>
          {(form.partOfSpeech === 'verb' || form.partOfSpeech === '') && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">🔤 Verb Forms</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {['v1', 'v2', 'v3', 'v_ing', 'v_s'].map(field => (
                  <div key={field}><label className="block text-xs text-gray-500 dark:text-gray-400 uppercase">{field}</label><input type="text" name={field} value={form[field as keyof typeof form] as string} onChange={handleChange} className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded text-sm" /></div>
                ))}
              </div>
            </div>
          )}
          {(form.partOfSpeech === 'noun' || form.partOfSpeech === '') && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📦 Noun Forms</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-500 dark:text-gray-400 uppercase">Plural</label><input type="text" name="plural_form" value={form.plural_form} onChange={handleChange} className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded text-sm" /></div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sinonim</label><input type="text" name="synonyms" value={form.synonyms} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="pisah koma" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Antonim</label><input type="text" name="antonyms" value={form.antonyms} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="pisah koma" /></div>
          </div>
          {/* TAGS - TAMBAHKAN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag / Kategori</label>
            <input type="text" name="tags" value={form.tags} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="pisah koma: Travel, Business, Technology" />
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catatan</label><textarea name="notes" rows={2} value={form.notes} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Catatan pribadi..." /></div>
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Menyimpan...' : 'Simpan ke Kamus'}
          </button>
        </form>
      </div>
    </div>
  );
}