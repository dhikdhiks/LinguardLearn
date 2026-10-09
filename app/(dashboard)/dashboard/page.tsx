import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import FocusWords from '@/components/FocusWords';
import PhrasesSection from '@/components/PhrasesSection';
import { db, phrases, userPhrases } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { getRandomVocabularyWithFlags, getVocabularyStats, getPhrasesStats } from '@/lib/user-progress';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Gunakan SQL-side count (ringan) untuk stats, bukan load semua data
  const [vocabStats, phraseStats] = await Promise.all([
    getVocabularyStats(session.user.id),
    getPhrasesStats(session.user.id),
  ]);

  // Ambil 1 kata acak (query ringan, tanpa menarik seluruh tabel)
  const randomWord = await getRandomVocabularyWithFlags(session.user.id);

  // Ambil unlearned phrases untuk PhrasesSection (limit 20 biar ringan)
  const unlearnedPhrasesResult = await db
    .select({
      phrase: phrases,
      isFavorite: userPhrases.isFavorite,
      isLearned: userPhrases.isLearned,
    })
    .from(phrases)
    .leftJoin(
      userPhrases,
      and(
        eq(userPhrases.phraseId, phrases.id),
        eq(userPhrases.userId, session.user.id)
      )
    )
    .where(sql`COALESCE(${userPhrases.isLearned}, false) = false`)
    .orderBy(phrases.id)
    .limit(20);

  const unlearnedPhrasesList = unlearnedPhrasesResult.map((r) => ({
    ...r.phrase,
    isFavorite: r.isFavorite ?? false,
    isLearned: r.isLearned ?? false,
  }));

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <p className="text-blue-100">Selamat datang, {session.user.name}!</p>
      </div>

      {/* Vocabulary Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">📚 Progress Vocabulary</h2>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {vocabStats.percentage}% ({vocabStats.learned} dari {vocabStats.total} kata)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
            style={{ width: `${vocabStats.percentage}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div>Total: {vocabStats.total}</div>
          <div className="text-green-600">Dihafal: {vocabStats.learned}</div>
          <div className="text-orange-500">Belum: {vocabStats.unlearned}</div>
          <div className="text-yellow-500">⭐ {vocabStats.favorite}</div>
        </div>
      </div>

      {/* Phrases Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">💬 Progress Phrases</h2>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {phraseStats.percentage}% ({phraseStats.learned} dari {phraseStats.total} kalimat)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
            style={{ width: `${phraseStats.percentage}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div>Total: {phraseStats.total}</div>
          <div className="text-green-600">Dihafal: {phraseStats.learned}</div>
          <div className="text-orange-500">Belum: {phraseStats.unlearned}</div>
          <div className="text-yellow-500">⭐ {phraseStats.favorite}</div>
        </div>
      </div>

      {/* Random Word of the Day */}
      {randomWord && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-xl mb-6 shadow-sm">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
            ✨ Kata Hari Ini
          </p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-2xl font-bold text-purple-800 dark:text-purple-300">
              {randomWord.word}
            </span>
            <span className="text-sm text-purple-600 dark:text-purple-300">
              {randomWord.translation}
            </span>
            {randomWord.phonetic && (
              <span className="text-xs text-purple-400 font-mono">{randomWord.phonetic}</span>
            )}
          </div>
          {randomWord.definition && (
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">{randomWord.definition}</p>
          )}
          <Link
            href={`/vocabulary/edit/${randomWord.id}`}
            className="text-xs text-purple-500 hover:underline mt-2 inline-block"
          >
            Lihat detail →
          </Link>
        </div>
      )}

      {/* Focus Words - hanya yang belum dihafal */}
      <FocusWords />

      {/* Random Phrases Section - hanya yang belum dihafal */}
      <PhrasesSection phrases={unlearnedPhrasesList} />

      {/* Tombol Aksi */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/vocabulary/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          ➕ Tambah Kata
        </Link>
        <Link
          href="/phrases/add"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          ➕ Tambah Kalimat
        </Link>
        <Link
          href="/vocabulary"
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          📚 Lihat Kamus
        </Link>
        <Link
          href="/phrases"
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          💬 Lihat Kalimat
        </Link>
        <Link
          href="/quiz-custom"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          🧠 Kuis
        </Link>
      </div>
    </div>
  );
}