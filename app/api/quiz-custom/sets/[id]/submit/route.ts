import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomSets, quizCustomAttempts } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Cek set exists
  const [set] = await db
    .select()
    .from(quizCustomSets)
    .where(and(eq(quizCustomSets.id, id), eq(quizCustomSets.userId, session.user.id)))
    .limit(1);

  if (!set) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { answers, durationSeconds, startedAt } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'answers wajib diisi' }, { status: 400 });
    }

    // Hitung skor
    let correctCount = 0;
    const processedAnswers = answers.map((a: any) => {
      const userAnswer = (a.userAnswer || '').trim().toLowerCase();
      const correctAnswer = (a.correctAnswer || '').trim().toLowerCase();
      
      // Untuk type_in: bandingkan case-insensitive, trim
      // Bisa ditambah fuzzy matching nanti
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctCount++;

      return {
        itemId: a.itemId,
        itemType: a.itemType,
        question: a.question,
        correctAnswer: a.correctAnswer,
        userAnswer: a.userAnswer || '',
        isCorrect,
        timeSpentMs: a.timeSpentMs,
      };
    });

    const totalQuestions = answers.length;
    const wrongCount = totalQuestions - correctCount;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const endedAt = new Date();
    const startTime = startedAt ? new Date(startedAt) : endedAt;
    const calcDuration = durationSeconds ?? Math.round((endedAt.getTime() - startTime.getTime()) / 1000);

    // Simpan attempt
    const [attempt] = await db
      .insert(quizCustomAttempts)
      .values({
        setId: id,
        userId: session.user.id,
        score,
        totalQuestions,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        durationSeconds: calcDuration,
        answers: processedAnswers,
        startedAt: startTime,
        endedAt,
      })
      .returning();

    return NextResponse.json({
      attemptId: attempt.id,
      score,
      totalQuestions,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      durationSeconds: calcDuration,
      answers: processedAnswers,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan hasil kuis' }, { status: 500 });
  }
}