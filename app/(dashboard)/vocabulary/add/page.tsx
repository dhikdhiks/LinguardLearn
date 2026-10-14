'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Save, Loader2, Plus, X } from 'lucide-react';
import { Spinner } from '@heroui/react';

interface WordFormInput {
  form: string;
  partOfSpeech: string;
  translation: string;
}

const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
];

const emptyForm = (): WordFormInput => ({ form: '', partOfSpeech: '', translation: '' });

export default function AddVocabularyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [forms, setForms] = useState<WordFormInput[]>([]);
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

  // === Bentuk kata terkait (verb/noun/adjective/adverb) ===
  const addFormRow = () => setForms(prev => [...prev, emptyForm()]);
  const updateFormRow = (index: number, field: keyof WordFormInput, value: string) => {
    setForms(prev => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };
  const removeFormRow = (index: number) => {
    setForms(prev => prev.filter((_, i) => i !== index));
  };

  const handleAutoFill = async () => {
    if (!form.word.trim()) {
      setError('Please enter a word first!');
      return;
    }
    setFetching(true);
    setError('');
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(form.word)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch data');
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
        setError('Auto-translation not found, please fill in manually.');
      } else if (data.partial) {
        setError('Definition or word-form data unavailable (dictionary source issue). Please fill in manually if needed.');
      }
    } catch {
      setError('Something went wrong');
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
    // Bentuk kata terkait (hanya yang terisi kata nya)
    const validForms = forms.filter(f => f.form.trim());
    formData.append('forms', JSON.stringify(validForms));

    try {
      const res = await fetch('/api/add-word', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Save failed');
        setLoading(false);
        return;
      }
      router.push('/vocabulary');
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/vocabulary')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Dictionary
      </button>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📝 Add New Word</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter a word, then click "Search" to auto-fill.</p>
        {error && <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">⚠️ {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input type="text" name="word" required value={form.word} onChange={handleChange} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. beautiful"
              onBlur={() => { if (form.word.trim() && !form.translation.trim()) handleAutoFill(); }} />
            <button type="button" onClick={handleAutoFill} disabled={fetching} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2">
              {fetching ? <Spinner size="sm" color="current" /> : <Search className="w-4 h-4" />} {fetching ? 'Loading...' : 'Search'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Translation *</label><input type="text" name="translation" required value={form.translation} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="meaning..." /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Part of Speech *</label><select name="partOfSpeech" required value={form.partOfSpeech} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"><option value="">Select...</option><option value="noun">Noun</option><option value="verb">Verb</option><option value="adjective">Adjective</option><option value="adverb">Adverb</option><option value="pronoun">Pronoun</option><option value="preposition">Preposition</option><option value="conjunction">Conjunction</option><option value="interjection">Interjection</option></select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phonetic</label><input type="text" name="phonetic" value={form.phonetic} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="/bjuːtɪfəl/" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tingkat</label><select name="difficulty" value={form.difficulty} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Definition</label><textarea name="definition" rows={2} value={form.definition} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="extremely pleasing..." /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Example Sentence</label><input type="text" name="exampleSentence" value={form.exampleSentence} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="She looked beautiful..." /></div>
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

          {/* BENTUK KATA TERKAIT (verb/noun/adjective/adverb) */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">🔗 Related Word Forms</p>
              <button
                type="button"
                onClick={addFormRow}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Form
              </button>
            </div>
            {forms.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No word forms yet. Example: action (noun) → act (verb), active (adjective), actively (adverb).
              </p>
            ) : (
              <div className="space-y-2">
                {forms.map((f, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      type="text"
                      value={f.form}
                      onChange={e => updateFormRow(i, 'form', e.target.value)}
                      placeholder="word form (e.g. act)"
                      className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded text-sm"
                    />
                    <select
                      value={f.partOfSpeech}
                      onChange={e => updateFormRow(i, 'partOfSpeech', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded text-sm"
                    >
                      <option value="">Part of speech...</option>
                      {PARTS_OF_SPEECH.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={f.translation}
                      onChange={e => updateFormRow(i, 'translation', e.target.value)}
                      placeholder="translation"
                      className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeFormRow(i)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition self-end sm:self-center"
                      title="Remove form"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sinonim</label><input type="text" name="synonyms" value={form.synonyms} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="comma-separated" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Antonim</label><input type="text" name="antonyms" value={form.antonyms} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="comma-separated" /></div>
          </div>
          {/* TAGS - TAMBAHKAN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag / Kategori</label>
            <input type="text" name="tags" value={form.tags} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="comma-separated: Travel, Business, Technology" />
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea name="notes" rows={2} value={form.notes} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Personal notes..." /></div>
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Save to Dictionary'}
          </button>
        </form>
      </div>
    </div>
  );
}