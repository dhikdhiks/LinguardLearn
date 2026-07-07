'use server';

import { db, vocabulary, userVocabulary } from 'db'; // db sudah mengekspor eq, and, dll.
import { and } from 'drizzle-orm'; // hanya import yang belum ada di db
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function addVocabularyToUser(vocabularyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // Gunakan eq dari db (sudah re-export)
  const existing = await db
    .select()
    .from(userVocabulary)
    .where(
      and(
        db.eq(userVocabulary.userId, session.user.id),
        db.eq(userVocabulary.vocabularyId, vocabularyId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: 'Sudah ada di daftar belajar.' };
  }

  await db.insert(userVocabulary).values({
    userId: session.user.id,
    vocabularyId: vocabularyId,
    status: 'learning',
    easeFactor: 2.5,
    repetition: 0,
    interval: 0,
    nextReviewAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath('/dashboard');
  revalidatePath('/learn');
  return { success: true, message: 'Berhasil ditambahkan!' };
}

export async function addNewWord(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const word = formData.get('word') as string;
  const translation = formData.get('translation') as string;
  const definition = formData.get('definition') as string;
  const partOfSpeech = formData.get('partOfSpeech') as string;
  const difficulty = formData.get('difficulty') as string;
  const exampleSentence = formData.get('exampleSentence') as string;
  const phonetic = formData.get('phonetic') as string;

  if (!word || !translation || !partOfSpeech) {
    throw new Error('Word, translation, and part of speech are required');
  }

  // Cek duplikat
  const existing = await db
    .select()
    .from(vocabulary)
    .where(db.eq(vocabulary.word, word))
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`Kata "${word}" sudah ada di kamus!`);
  }

  await db.insert(vocabulary).values({
    word,
    translation,
    definition: definition || null,
    partOfSpeech: partOfSpeech as any,
    difficulty: (difficulty as any) || 'beginner',
    exampleSentence: exampleSentence || null,
    phonetic: phonetic || null,
    createdAt: new Date(),
  });

  revalidatePath('/vocabulary');
  revalidatePath('/dashboard');
  redirect('/vocabulary');
}