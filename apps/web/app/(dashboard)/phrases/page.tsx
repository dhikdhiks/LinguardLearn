import { db, phrases } from 'db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function PhrasesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const allPhrases = await db.select().from(phrases).orderBy(phrases.phrase);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">💬 Kalimat Sehari-hari</h1>
      <p className="text-gray-600 mb-6">Kumpulan kalimat dan ungkapan sehari-hari.</p>

      {allPhrases.length === 0 ? (
        <p className="text-gray-500">Belum ada kalimat. Tambahkan via seed atau form.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allPhrases.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="font-medium text-gray-900">{p.phrase}</div>
              <div className="text-gray-600 text-sm">{p.translation}</div>
              {p.phonetic && <div className="text-xs text-gray-400 font-mono">{p.phonetic}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}