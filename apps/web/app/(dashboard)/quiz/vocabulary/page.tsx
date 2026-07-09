'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft, Check, X, Send } from 'lucide-react';

interface Word {
  id: string;
  word: string;
  translation: string;
  definition: string | null;
  partOfSpeech: string | null;
  difficulty: string | null;
  exampleSentence: string | null;
}

export default function QuizVocabularyPage() {
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(['beginner', 'intermediate', 'advanced']);
  const [questionLimit, setQuestionLimit] = useState(10);

  useEffect(() => {
    if (selectedDifficulties.length === 0) {
      setWords([]);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    selectedDifficulties.forEach(d => params.append('difficulties', d));
    params.append('limit', String(questionLimit));
    fetch(`/api/vocabulary/quiz?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setWords(data);
        setCurrentIndex(0);
        setShowResult(false);
        setFinished(false);
        setScore({ correct: 0, wrong: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDifficulties, questionLimit]);

  const toggleDifficulty = (diff: string) => {
    setSelectedDifficulties(prev =>
      prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
    );
  };

  const handleCheckAnswer = () => {
    const currentWord = words[currentIndex];
    const isWordCorrect = userAnswer.trim().toLowerCase() === currentWord.word.toLowerCase();
    const isPosCorrect = selectedPartOfSpeech === currentWord.partOfSpeech;
    const correct = isWordCorrect && isPosCorrect;
    setIsCorrect(correct);
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }));
    setShowResult(true);
  };

  const handleNext = () => {
    setShowResult(false);
    setUserAnswer('');
    setSelectedPartOfSpeech('');
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setScore({ correct: 0, wrong: 0 });
    setFinished(false);
    setShowResult(false);
    setUserAnswer('');
    setSelectedPartOfSpeech('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showResult) handleCheckAnswer();
    else if (e.key === 'Enter' && showResult) handleNext();
  };

  if (loading) return <div className="text-center py-12">⏳ Memuat soal...</div>;

  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-500 text-lg">Pilih minimal satu tingkat kesulitan.</p>
      </div>
    );
  }

  if (finished) {
    const total = score.correct + score.wrong;
    const percentage = total > 0 ? Math.round((score.correct / total) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/vocabulary')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <h2 className="text-2xl font-bold text-gray-900">🎉 Selesai!</h2>
          <div className="flex justify-center gap-8 mt-6">
            <div><p className="text-3xl font-bold text-green-600">{score.correct}</p><p className="text-sm text-gray-500">Benar</p></div>
            <div><p className="text-3xl font-bold text-red-600">{score.wrong}</p><p className="text-sm text-gray-500">Salah</p></div>
            <div><p className="text-3xl font-bold text-blue-600">{percentage}%</p><p className="text-sm text-gray-500">Akurasi</p></div>
          </div>
          <button onClick={handleReset} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Ulangi</button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push('/vocabulary')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700 mr-2">Tingkat:</span>
            {['beginner', 'intermediate', 'advanced'].map(diff => (
              <label key={diff} className="inline-flex items-center mr-2">
                <input
                  type="checkbox"
                  checked={selectedDifficulties.includes(diff)}
                  onChange={() => toggleDifficulty(diff)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-1 text-sm text-gray-700">{diff}</span>
              </label>
            ))}
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700 mr-2">Jumlah:</span>
            <select
              value={questionLimit}
              onChange={(e) => setQuestionLimit(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md"
            >
              {[5,10,15,20,25,30].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between text-sm text-gray-500 mb-6">
          <span>Soal {currentIndex + 1} dari {words.length}</span>
          <span>✅ {score.correct} | ❌ {score.wrong}</span>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-1">Terjemahan Indonesia</p>
          <h2 className="text-3xl font-bold text-gray-900">{currentWord.translation}</h2>
          <div className="mt-4">
            <p className="text-sm text-gray-400">Jenis Kata</p>
            <p className="text-lg font-semibold text-blue-600">{currentWord.partOfSpeech || '?'}</p>
          </div>
          {currentWord.definition && (
            <details className="mt-4 text-sm text-gray-400">
              <summary className="cursor-pointer hover:text-gray-600">💡 Clue (definisi)</summary>
              <p className="mt-2 text-gray-600 bg-gray-50 p-2 rounded">{currentWord.definition}</p>
            </details>
          )}
        </div>
        <div className="space-y-4 mt-6">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showResult}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg disabled:bg-gray-100"
            placeholder="Ketik jawaban..."
            autoFocus
          />
          <select
            value={selectedPartOfSpeech}
            onChange={(e) => setSelectedPartOfSpeech(e.target.value)}
            disabled={showResult}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
          >
            <option value="">-- Pilih jenis kata --</option>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="adverb">Adverb</option>
            <option value="pronoun">Pronoun</option>
            <option value="preposition">Preposition</option>
            <option value="conjunction">Conjunction</option>
            <option value="interjection">Interjection</option>
          </select>
          {!showResult ? (
            <button
              onClick={handleCheckAnswer}
              disabled={!userAnswer.trim() || !selectedPartOfSpeech}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition"
            >
              <Send className="w-4 h-4" /> Cek Jawaban
            </button>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg text-center ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isCorrect ? <><Check className="w-6 h-6 inline mr-2" /> Benar! 🎉</> : <><X className="w-6 h-6 inline mr-2" /> Jawaban: <strong>{currentWord.word}</strong></>}
              </div>
              <button onClick={handleNext} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition">
                {currentIndex + 1 < words.length ? 'Soal Berikutnya →' : 'Lihat Hasil 🎯'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}