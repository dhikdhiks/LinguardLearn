import { NextResponse } from 'next/server';
import { db, vocabulary, vocabularyForms } from '@/lib/db';
import { inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const words = await db.select().from(vocabulary).orderBy(vocabulary.word);

  // Ambil bentuk kata terkait untuk semua kata (1 query tambahan, ter-index)
  const vocabIds = words.map(w => w.id);
  const formsByVocab = new Map<string, Array<{ form: string; partOfSpeech: string | null; translation: string | null }>>();
  if (vocabIds.length > 0) {
    const formRows = await db
      .select({
        vocabularyId: vocabularyForms.vocabularyId,
        form: vocabularyForms.form,
        partOfSpeech: vocabularyForms.partOfSpeech,
        translation: vocabularyForms.translation,
      })
      .from(vocabularyForms)
      .where(inArray(vocabularyForms.vocabularyId, vocabIds))
      .orderBy(vocabularyForms.createdAt);
    for (const fr of formRows) {
      const list = formsByVocab.get(fr.vocabularyId) ?? [];
      list.push({ form: fr.form, partOfSpeech: fr.partOfSpeech, translation: fr.translation });
      formsByVocab.set(fr.vocabularyId, list);
    }
  }

  return NextResponse.json(
    words.map(w => ({ ...w, forms: formsByVocab.get(w.id) ?? [] }))
  );
}