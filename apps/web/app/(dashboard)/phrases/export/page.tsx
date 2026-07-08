'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileJson, FileSpreadsheet } from 'lucide-react';

export default function ExportPhrasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      const res = await fetch('/api/phrases');
      const data = await res.json();

      if (format === 'json') {
        const exportData = data.map((p: any) => ({
          phrase: p.phrase,
          translation: p.translation,
        }));
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phrases-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const headers = ['phrase', 'translation'];
        const rows = data.map((p: any) => [p.phrase, p.translation]);
        const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phrases-export-${new Date().toISOString().split('T')[0]}.csv`;
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
        onClick={() => router.push('/phrases')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📤 Ekspor Phrases</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Ekspor semua kalimat ke file JSON atau CSV.</p>
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