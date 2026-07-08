'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';

export default function ImportPhrasesPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: string[] } | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [jsonLoading, setJsonLoading] = useState(false);

  const handleImportFromText = async () => {
    if (!text.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    setLoading(true);
    setResult(null);
    let success = 0;
    let failed: string[] = [];

    for (const line of lines) {
      // Format: "phrase|translation" atau "phrase,translation"
      const parts = line.includes('|') ? line.split('|') : line.split(',');
      if (parts.length < 2) {
        failed.push(`${line} (format salah)`);
        continue;
      }
      const phrase = parts[0].trim();
      const translation = parts.slice(1).join(',').trim();
      if (!phrase || !translation) {
        failed.push(`${line} (format salah)`);
        continue;
      }

      try {
        const res = await fetch('/api/phrases/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ phrase, translation }]),
        });
        const data = await res.json();
        if (res.ok && data.imported > 0) success++;
        else failed.push(`${phrase} (gagal)`);
      } catch {
        failed.push(`${phrase} (error)`);
      }
    }

    setResult({ success, failed });
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data) && data.length > 0) {
          setPreviewData(data);
        } else {
          alert('File harus berupa array of objects.');
        }
      } catch {
        alert('File JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    if (previewData.length === 0) return;
    setJsonLoading(true);
    try {
      const res = await fetch('/api/phrases/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewData),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: data.imported, failed: [] });
        setPreviewData([]);
      } else {
        alert(data.error || 'Gagal import JSON');
      }
    } catch {
      alert('Error import JSON');
    } finally {
      setJsonLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/phrases')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Kalimat
      </button>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📥 Impor Phrases</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Masukkan satu kalimat per baris dengan format: <strong>phrase|translation</strong> atau <strong>phrase,translation</strong>.
          Atau upload file JSON.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
          placeholder="How are you?|Apa kabar?&#10;Good morning|Selamat pagi&#10;Nice to meet you|Senang bertemu Anda"
        />
        <button
          onClick={handleImportFromText}
          disabled={loading || !text.trim()}
          className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition w-full"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {loading ? 'Memproses...' : 'Import dari Teks'}
        </button>

        <hr className="my-6 border-gray-200 dark:border-gray-700" />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload File JSON</label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
          />
          {previewData.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Preview: {previewData.length} kalimat siap diimport</p>
              <button
                onClick={handleImportJson}
                disabled={jsonLoading}
                className="mt-2 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                {jsonLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import JSON'}
              </button>
            </div>
          )}
        </div>

        {result && (
          <div className="mt-4 p-4 rounded-lg border dark:border-gray-600">
            <p className="font-medium text-gray-900 dark:text-white">✅ Berhasil: {result.success} kalimat</p>
            {result.failed.length > 0 && (
              <div className="mt-2">
                <p className="text-red-600 font-medium">❌ Gagal: {result.failed.length} kalimat</p>
                <ul className="text-sm text-red-500 list-disc ml-4">
                  {result.failed.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}