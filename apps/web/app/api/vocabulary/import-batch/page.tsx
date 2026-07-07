'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';

export default function BatchImportPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: string[] } | null>(null);

  const handleImport = async () => {
    if (!text.trim()) return;
    const words = text.split('\n').map(w => w.trim()).filter(Boolean);
    if (words.length === 0) return;

    setLoading(true);
    setResult(null);
    let success = 0;
    let failed: string[] = [];

    for (const word of words) {
      try {
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
        const data = await res.json();
        if (!res.ok) {
          failed.push(`${word} (tidak ditemukan)`);
          continue;
        }
        const formData = new FormData();
        formData.append('word', data.word || word);
        formData.append('translation', data.translation || '');
        formData.append('definition', data.definition || '');
        formData.append('partOfSpeech', data.partOfSpeech || '');
        formData.append('difficulty', 'beginner');
        formData.append('exampleSentence', data.exampleSentence || '');
        formData.append('phonetic', data.phonetic || '');
        formData.append('v1', data.v1 || '');
        formData.append('v2', data.v2 || '');
        formData.append('v3', data.v3 || '');
        formData.append('v_ing', data.v_ing || '');
        formData.append('v_s', data.v_s || '');
        formData.append('synonyms', data.synonyms?.join(', ') || '');
        formData.append('antonyms', data.antonyms?.join(', ') || '');
        formData.append('tags', '[]'); // kosong

        const saveRes = await fetch('/api/add-word', { method: 'POST', body: formData });
        if (saveRes.ok) success++;
        else failed.push(`${word} (gagal simpan)`);
      } catch {
        failed.push(`${word} (error)`);
      }
    }

    setResult({ success, failed });
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/vocabulary')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"><ArrowLeft className="w-4 h-4" /> Kembali ke Kamus</button>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📋 Import Batch</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Masukkan satu kata per baris. Sistem akan otomatis mencari data dari kamus.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm" placeholder="apple&#10;book&#10;cat&#10;dog" />
        <button onClick={handleImport} disabled={loading || !text.trim()} className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition w-full">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{loading ? 'Memproses...' : 'Import Sekarang'}</button>
        {result && (
          <div className="mt-4 p-4 rounded-lg border dark:border-gray-600">
            <p className="font-medium">✅ Berhasil: {result.success} kata</p>
            {result.failed.length > 0 && (
              <div className="mt-2"><p className="text-red-600 font-medium">❌ Gagal: {result.failed.length} kata</p>
                <ul className="text-sm text-red-500 list-disc ml-4">{result.failed.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}