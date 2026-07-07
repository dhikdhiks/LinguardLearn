'use server';

import { db, vocabulary, userVocabulary, eq, and } from 'db';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ============================================================
// 1. TAMBAH KATA KE DAFTAR BELAJAR (userVocabulary)
// ============================================================
export async function addVocabularyToUser(vocabularyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // Cek apakah sudah ada
  const existing = await db
    .select()
    .from(userVocabulary)
    .where(
      and(
        eq(userVocabulary.userId, session.user.id),
        eq(userVocabulary.vocabularyId, vocabularyId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: 'Kata sudah ada di daftar belajar Anda.' };
  }

  // Tambahkan
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
  return { success: true, message: 'Kata berhasil ditambahkan!' };
}

// ============================================================
// 2. HAPUS KATA DARI DAFTAR BELAJAR
// ============================================================
export async function removeVocabularyFromUser(vocabularyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await db
    .delete(userVocabulary)
    .where(
      and(
        eq(userVocabulary.userId, session.user.id),
        eq(userVocabulary.vocabularyId, vocabularyId)
      )
    );

  revalidatePath('/dashboard');
  revalidatePath('/learn');
  return { success: true, message: 'Kata dihapus dari daftar belajar.' };
}

// ============================================================
// 3. TAMBAH KATA BARU KE MASTER VOCABULARY
// ============================================================
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
    .where(eq(vocabulary.word, word))
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