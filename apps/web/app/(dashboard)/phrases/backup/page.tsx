'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function BackupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/phrases');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lingua-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: '✅ Backup berhasil diunduh!' });
    } catch {
      setMessage({ type: 'error', text: '❌ Gagal export data' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/phrases/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ Berhasil mengimport ${result.imported} kata!` });
        setTimeout(() => router.push('/phrases'), 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Gagal import' });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ File tidak valid' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.push('/phrases')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Kamus
      </button>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">💾 Backup & Restore</h1>
        <p className="text-gray-500 text-sm mb-6">
          Ekspor semua kata ke file JSON untuk backup, atau import dari file backup sebelumnya.
        </p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>

          <label className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-medium transition cursor-pointer">
            <Upload className="w-4 h-4" />
            {loading ? 'Mengimport...' : 'Import JSON'}
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
      </div>
    </div>
  );
}