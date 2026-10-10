import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomSets, quizCustomSetItems, vocabulary, phrases, userVocabulary, userPhrases } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Ambil set dengan items
  const [set] = await db
    .select()
    .from(quizCustomSets)
    .where(eq(quizCustomSets.id, id))
    .limit(1);

  if (!set) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  // Jika tidak dipublikasikan, hanya pemilik yang bisa memainkannya
  if (!set.isPublic && set.userId !== session.user.id) {
    return NextResponse.json({ error: 'Kuis ini bersifat pribadi' }, { status: 403 });
  }

  const items = await db
    .select()
    .from(quizCustomSetItems)
    .where(eq(quizCustomSetItems.setId, id))
    .orderBy(quizCustomSetItems.sortOrder);

  if (items.length === 0) {
    return NextResponse.json({ error: 'Kuis kosong, tambahkan soal dulu' }, { status: 400 });
  }

  // Ambil data lengkap vocabulary/phrases
  const vocabIds = items.filter(i => i.itemType === 'vocabulary').map(i => i.itemId);
  const phraseIds = items.filter(i => i.itemType === 'phrases').map(i => i.itemId);

  const [vocabData, phraseData] = await Promise.all([
    vocabIds.length > 0
      ? db.select().from(vocabulary).where(inArray(vocabulary.id, vocabIds))
      : Promise.resolve([]),
    phraseIds.length > 0
      ? db.select().from(phrases).where(inArray(phrases.id, phraseIds))
      : Promise.resolve([]),
  ]);

  const vocabMap = new Map(vocabData.map(v => [v.id, v]));
  const phraseMap = new Map(phraseData.map(p => [p.id, p]));

  // Ambil flags per-user untuk learned/favorite
  const [userVocabFlags, userPhraseFlags] = await Promise.all([
    vocabIds.length > 0
      ? db
          .select({ vocabularyId: userVocabulary.vocabularyId, isLearned: userVocabulary.isLearned, isFavorite: userVocabulary.isFavorite })
          .from(userVocabulary)
          .where(and(eq(userVocabulary.userId, session.user.id), inArray(userVocabulary.vocabularyId, vocabIds)))
      : Promise.resolve([]),
    phraseIds.length > 0
      ? db
          .select({ phraseId: userPhrases.phraseId, isLearned: userPhrases.isLearned, isFavorite: userPhrases.isFavorite })
          .from(userPhrases)
          .where(and(eq(userPhrases.userId, session.user.id), inArray(userPhrases.phraseId, phraseIds)))
      : Promise.resolve([]),
  ]);

  const vocabFlags = new Map(userVocabFlags.map(f => [f.vocabularyId, { isLearned: f.isLearned ?? false, isFavorite: f.isFavorite ?? false }]));
  const phraseFlags = new Map(userPhraseFlags.map(f => [f.phraseId, { isLearned: f.isLearned ?? false, isFavorite: f.isFavorite ?? false }]));

  // Build questions
  let questions = items.map((item, index) => {
    let sourceText: string;
    let targetText: string;
    let itemData: typeof vocabData[0] | typeof phraseData[0] | null = null;
    let flags = { isLearned: false, isFavorite: false };

    if (item.itemType === 'vocabulary') {
      itemData = vocabMap.get(item.itemId) ?? null;
      flags = vocabFlags.get(item.itemId) ?? { isLearned: false, isFavorite: false };
      sourceText = itemData?.word ?? '';
      targetText = itemData?.translation ?? '';
    } else {
      itemData = phraseMap.get(item.itemId) ?? null;
      flags = phraseFlags.get(item.itemId) ?? { isLearned: false, isFavorite: false };
      sourceText = itemData?.phrase ?? '';
      targetText = itemData?.translation ?? '';
    }

    // Override dengan custom question/answer jika ada
    const questionText = item.customQuestion?.trim() || sourceText;
    const answerText = item.customAnswer?.trim() || targetText;

    return {
      id: item.id,
      index,
      itemType: item.itemType,
      itemId: item.itemId,
      // Soal yang ditampilkan ke user
      question: questionText,
      // Jawaban benar (untuk grading)
      correctAnswer: answerText,
      // Info tambahan
      sourceText,
      targetText,
      phonetic: itemData?.phonetic ?? null,
      difficulty: itemData?.difficulty ?? null,
      isLearned: flags.isLearned ?? false,
      isFavorite: flags.isFavorite ?? false,
    };
  });

  // Filter hanya yang belum dihafal jika diinginkan (opsional - bisa ditambah di setting)
  // Shuffle jika enabled
  if (set.shuffleQuestions) {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }

  // Limit jumlah soal per sesi
  const questionsPerSession = set.questionsPerSession ?? 0;
  if (questionsPerSession > 0 && questions.length > questionsPerSession) {
    questions = questions.slice(0, questionsPerSession);
  }

  // Untuk multiple choice, generate distractors
  if (set.questionType === 'multiple_choice' || set.questionType === 'mixed') {
    // Ambil distractors dari database (kata/kalimat lain)
    const allVocab = await db.select({ id: vocabulary.id, word: vocabulary.word, translation: vocabulary.translation }).from(vocabulary).limit(100);
    const allPhrases = await db.select({ id: phrases.id, phrase: phrases.phrase, translation: phrases.translation }).from(phrases).limit(100);

    questions = questions.map(q => {
      const isMultipleChoice = set.questionType === 'multiple_choice' || (set.questionType === 'mixed' && Math.random() > 0.5);
      if (!isMultipleChoice) return q;

      const correctAnswer = q.correctAnswer;
      const pool = q.itemType === 'vocabulary' ? allVocab : allPhrases;
      const distractors = pool
        .filter(p => {
          const pText = q.itemType === 'vocabulary' ? p.translation : p.translation;
          return pText !== correctAnswer;
        })
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(p => q.itemType === 'vocabulary' ? p.translation : p.translation);

      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

      return {
        ...q,
        isMultipleChoice: true,
        options,
      };
    });
  }

  return NextResponse.json({
    setId: set.id,
    setName: set.name,
    direction: set.direction,
    questionType: set.questionType,
    totalQuestions: questions.length,
    questions,
    startedAt: new Date().toISOString(),
  });
}