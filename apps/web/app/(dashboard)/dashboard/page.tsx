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

  // Vocabulary stats
  const totalWords = allWords.length;
  const learnedWords = allWords.filter((w) => w.isLearned).length;
  const unlearnedWords = allWords.filter((w) => !w.isLearned);
  const favoriteWords = allWords.filter((w) => w.isFavorite).length;
  const wordPercentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

  // Phrases stats
  const totalPhrases = allPhrases.length;
  const learnedPhrases = allPhrases.filter((p) => p.isLearned).length;
  const unlearnedPhrases = allPhrases.filter((p) => !p.isLearned);
  const favoritePhrases = allPhrases.filter((p) => p.isFavorite).length;
  const phrasePercentage = totalPhrases > 0 ? Math.round((learnedPhrases / totalPhrases) * 100) : 0;

  // Random word of the day
  const randomWord = allWords.length > 0 ? allWords[Math.floor(Math.random() * allWords.length)] : null;

  // Filter phrases untuk hanya yang belum dihafal
  const unlearnedPhrasesList = allPhrases.filter(p => !p.isLearned);

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
            {wordPercentage}% ({learnedWords} dari {totalWords} kata)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
            style={{ width: `${wordPercentage}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div>Total: {totalWords}</div>
          <div className="text-green-600">Dihafal: {learnedWords}</div>
          <div className="text-orange-500">Belum: {unlearnedWords.length}</div>
          <div className="text-yellow-500">⭐ {favoriteWords}</div>
        </div>
      </div>

      {/* Phrases Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">💬 Progress Phrases</h2>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {phrasePercentage}% ({learnedPhrases} dari {totalPhrases} kalimat)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
            style={{ width: `${phrasePercentage}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div>Total: {totalPhrases}</div>
          <div className="text-green-600">Dihafal: {learnedPhrases}</div>
          <div className="text-orange-500">Belum: {unlearnedPhrases.length}</div>
          <div className="text-yellow-500">⭐ {favoritePhrases}</div>
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
          href="/quiz"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          🧠 Kuis
        </Link>
      </div>
    </div>
  );
}