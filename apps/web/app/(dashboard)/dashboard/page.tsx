import { db, vocabulary, phrases } from 'db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import FocusWords from '@/components/FocusWords';
import PhrasesSection from '@/components/PhrasesSection';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const allWords = await db.select().from(vocabulary);
  const allPhrases = await db.select().from(phrases);

  const total = allWords.length;
  const learned = allWords.filter(w => w.isLearned).length;
  const unlearned = allWords.filter(w => !w.isLearned);
  const favorites = allWords.filter(w => w.isFavorite).length;
  const percentage = total > 0 ? Math.round((learned / total) * 100) : 0;

  // Random word of the day
  const randomWord = allWords.length > 0 ? allWords[Math.floor(Math.random() * allWords.length)] : null;

  return (
    <div>
      {/* Welcome + Stats */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <p className="text-blue-100">Selamat datang, {session.user.name}!</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
          <span>Progress Belajar</span>
          <span>{percentage}% ({learned} dari {total} kata)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Kata" value={total} icon="📚" color="blue" />
        <StatCard title="Sudah Dihafal" value={learned} icon="✅" color="green" />
        <StatCard title="Belum Dihafal" value={unlearned.length} icon="📖" color="orange" />
        <StatCard title="Favorit" value={favorites} icon="⭐" color="purple" />
      </div>

      {/* Random Word of the Day */}
      {randomWord && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-xl mb-6 shadow-sm">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">✨ Kata Hari Ini</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-2xl font-bold text-purple-800">{randomWord.word}</span>
            <span className="text-sm text-purple-600">{randomWord.translation}</span>
            {randomWord.phonetic && <span className="text-xs text-purple-400 font-mono">{randomWord.phonetic}</span>}
          </div>
          {randomWord.definition && <p className="text-sm text-purple-700 mt-1">{randomWord.definition}</p>}
          <Link href={`/vocabulary/edit/${randomWord.id}`} className="text-xs text-purple-500 hover:underline mt-2 inline-block">
            Lihat detail →
          </Link>
        </div>
      )}

      {/* Focus Words (Belum Dihafal, Intermediate/Advanced) */}
      <FocusWords />

      {/* ===== PHRASES SECTION (10 Random Phrases) ===== */}
      <PhrasesSection phrases={allPhrases} />

      {/* Tombol Aksi */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/vocabulary/add" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          ➕ Tambah Kata
        </Link>
        <Link href="/vocabulary" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition">
          📚 Lihat Kamus
        </Link>
        <Link href="/quiz" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          🧠 Kuis
        </Link>
        <Link href="/phrases" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          💬 Kalimat
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-green-50 border-green-100 text-green-600',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color as keyof typeof colors]} shadow-sm`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}