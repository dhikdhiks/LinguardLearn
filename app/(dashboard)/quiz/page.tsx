'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuizHomePage() {
  const router = useRouter();
  const [quizType, setQuizType] = useState<'vocabulary' | 'phrases'>('vocabulary');

  const handleStartQuiz = () => {
    if (quizType === 'vocabulary') {
      router.push('/quiz/vocabulary');
    } else {
      router.push('/quiz/phrases');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🧠 Pilih Jenis Kuis</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">Pilih jenis materi yang ingin diuji.</p>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="space-y-4">
          <div
            className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer ${
              quizType === 'vocabulary'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600'
            }`}
            onClick={() => setQuizType('vocabulary')}
          >
            <input
              type="radio"
              name="quizType"
              value="vocabulary"
              checked={quizType === 'vocabulary'}
              onChange={() => setQuizType('vocabulary')}
              className="h-4 w-4 text-blue-600"
            />
            <div>
              <div className="font-medium text-gray-800 dark:text-white">📚 Vocabulary</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Uji hafalan kosakata</div>
            </div>
          </div>
          <div
            className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer ${
              quizType === 'phrases'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-600'
            }`}
            onClick={() => setQuizType('phrases')}
          >
            <input
              type="radio"
              name="quizType"
              value="phrases"
              checked={quizType === 'phrases'}
              onChange={() => setQuizType('phrases')}
              className="h-4 w-4 text-purple-600"
            />
            <div>
              <div className="font-medium text-gray-800 dark:text-white">💬 Phrases</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Uji pemahaman kalimat sehari-hari</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleStartQuiz}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition"
        >
          Mulai Kuis
        </button>
      </div>
    </div>
  );
}