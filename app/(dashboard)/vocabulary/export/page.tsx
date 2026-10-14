'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileJson, FileSpreadsheet } from 'lucide-react';

export default function ExportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      const res = await fetch('/api/vocabulary/export');
      const data = await res.json();
      if (!Array.isArray(data)) {
        alert('Gagal export: data tidak valid');
        return;
      }

      const serializeForms = (forms: any[] | undefined) =>
        (forms ?? [])
          .map(
            (f: any) =>
              `${f.form ?? ''}${f.partOfSpeech ? ` (${f.partOfSpeech})` : ''}${f.translation ? `: ${f.translation}` : ''}`
          )
          .join(' | ');

      if (format === 'json') {
        const exportData = data.map((w: any) => ({
          word: w.word,
          translation: w.translation,
          partOfSpeech: w.partOfSpeech,
          definition: w.definition,
          exampleSentence: w.exampleSentence,
          phonetic: w.phonetic,
          difficulty: w.difficulty,
          v1: w.v1,
          v2: w.v2,
          v3: w.v3,
          v_ing: w.v_ing,
          v_s: w.v_s,
          plural_form: w.plural_form,
          synonyms: w.synonyms,
          antonyms: w.antonyms,
          tags: w.tags,
          notes: w.notes,
          forms: (w.forms ?? []).map((f: any) => ({
            form: f.form,
            partOfSpeech: f.partOfSpeech,
            translation: f.translation,
          })),
        }));
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocabulary-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV
        const csvEscape = (v: unknown) => {
          const s = String(v ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const headers = ['word', 'translation', 'partOfSpeech', 'difficulty', 'forms'];
        const rows = data.map((w: any) => [
          csvEscape(w.word),
          csvEscape(w.translation),
          csvEscape(w.partOfSpeech ?? ''),
          csvEscape(w.difficulty ?? ''),
          csvEscape(serializeForms(w.forms)),
        ]);
        const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocabulary-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Gagal export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.push('/vocabulary')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📤 Ekspor Kosakata</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Ekspor semua kosakata ke file JSON atau CSV.</p>
        <div className="flex gap-4">
          <button
            onClick={() => handleExport('json')}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <FileJson className="w-5 h-5" /> Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <FileSpreadsheet className="w-5 h-5" /> Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}