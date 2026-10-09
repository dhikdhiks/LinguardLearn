import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, quizCustomSets, quizCustomSetItems, vocabulary, phrases } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';

// Ambil teks sumber & target untuk sekumpulan item (vocabulary/phrases)
async function enrichItems(
  items: Array<{
    id: string;
    setId: string;
    itemType: string;
    itemId: string;
    customQuestion: string | null;
    customAnswer: string | null;
    sortOrder: number | null;
  }>
) {
  const vocabIds = items.filter((i) => i.itemType === 'vocabulary').map((i) => i.itemId);
  const phraseIds = items.filter((i) => i.itemType === 'phrases').map((i) => i.itemId);

  const [vocabData, phraseData] = await Promise.all([
    vocabIds.length > 0
      ? db
          .select({ id: vocabulary.id, word: vocabulary.word, translation: vocabulary.translation })
          .from(vocabulary)
          .where(inArray(vocabulary.id, vocabIds))
      : Promise.resolve([]),
    phraseIds.length > 0
      ? db
          .select({ id: phrases.id, phrase: phrases.phrase, translation: phrases.translation })
          .from(phrases)
          .where(inArray(phrases.id, phraseIds))
      : Promise.resolve([]),
  ]);

  const vocabMap = new Map(vocabData.map((v) => [v.id, v]));
  const phraseMap = new Map(phraseData.map((p) => [p.id, p]));

  return items.map((item) => {
    if (item.itemType === 'vocabulary') {
      const v = vocabMap.get(item.itemId);
      return { ...item, sourceText: v?.word ?? '', targetText: v?.translation ?? '' };
    }
    const p = phraseMap.get(item.itemId);
    return { ...item, sourceText: p?.phrase ?? '', targetText: p?.translation ?? '' };
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Cek ownership
  const [set] = await db
    .select()
    .from(quizCustomSets)
    .where(and(eq(quizCustomSets.id, id), eq(quizCustomSets.userId, session.user.id)))
    .limit(1);

  if (!set) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
  }

  const items = await db
    .select()
    .from(quizCustomSetItems)
    .where(eq(quizCustomSetItems.setId, id))
    .orderBy(quizCustomSetItems.sortOrder);

  return NextResponse.json(await enrichItems(items as any));
}

// PUT: ganti SELURUH item set dalam satu request (bulk replace)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Cek ownership
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
    const rawItems = Array.isArray(body?.items) ? body.items : null;

    if (!rawItems) {
      return NextResponse.json({ error: 'Format items tidak valid' }, { status: 400 });
    }

    // Validasi + dedupe berdasarkan (itemType, itemId)
    const seen = new Set<string>();
    const cleanItems: Array<{
      setId: string;
      itemType: string;
      itemId: string;
      customQuestion: string | null;
      customAnswer: string | null;
      sortOrder: number;
    }> = [];

    for (const raw of rawItems) {
      const itemType = raw?.itemType;
      const itemId = raw?.itemId;
      if (!itemType || !itemId) {
        return NextResponse.json({ error: 'itemType dan itemId wajib diisi' }, { status: 400 });
      }
      if (!['vocabulary', 'phrases'].includes(itemType)) {
        return NextResponse.json({ error: 'itemType harus vocabulary atau phrases' }, { status: 400 });
      }
      const key = `${itemType}:${itemId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cleanItems.push({
        setId: id,
        itemType,
        itemId,
        customQuestion: raw.customQuestion?.trim() || null,
        customAnswer: raw.customAnswer?.trim() || null,
        sortOrder: cleanItems.length,
      });
    }

    // Replace in satu transaksi
    await db.transaction(async (tx) => {
      await tx.delete(quizCustomSetItems).where(eq(quizCustomSetItems.setId, id));
      if (cleanItems.length > 0) {
        await tx.insert(quizCustomSetItems).values(
          cleanItems.map((item) => ({ ...item, createdAt: new Date() }))
        );
      }
    });

    const saved = await db
      .select()
      .from(quizCustomSetItems)
      .where(eq(quizCustomSetItems.setId, id))
      .orderBy(quizCustomSetItems.sortOrder);

    return NextResponse.json(await enrichItems(saved as any));
  } catch (error) {
    console.error('Replace quiz items error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan soal' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Cek ownership
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
    const { itemType, itemId, customQuestion, customAnswer } = body;

    if (!itemType || !itemId) {
      return NextResponse.json({ error: 'itemType dan itemId wajib diisi' }, { status: 400 });
    }

    if (!['vocabulary', 'phrases'].includes(itemType)) {
      return NextResponse.json({ error: 'itemType harus vocabulary atau phrases' }, { status: 400 });
    }

    // Validasi item exists
    if (itemType === 'vocabulary') {
      const [vocab] = await db.select({ id: vocabulary.id }).from(vocabulary).where(eq(vocabulary.id, itemId)).limit(1);
      if (!vocab) return NextResponse.json({ error: 'Kata tidak ditemukan' }, { status: 404 });
    } else {
      const [phrase] = await db.select({ id: phrases.id }).from(phrases).where(eq(phrases.id, itemId)).limit(1);
      if (!phrase) return NextResponse.json({ error: 'Kalimat tidak ditemukan' }, { status: 404 });
    }

    // Cek duplikat
    const [existing] = await db
      .select()
      .from(quizCustomSetItems)
      .where(and(eq(quizCustomSetItems.setId, id), eq(quizCustomSetItems.itemType, itemType), eq(quizCustomSetItems.itemId, itemId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Item sudah ada di kuis ini' }, { status: 400 });
    }

    // Dapatkan sortOrder maksimal
    const existingItems = await db
      .select({ sortOrder: quizCustomSetItems.sortOrder })
      .from(quizCustomSetItems)
      .where(eq(quizCustomSetItems.setId, id));
    const nextOrder = existingItems.reduce((max, i) => Math.max(max, i.sortOrder ?? 0), -1) + 1;

    const [newItem] = await db
      .insert(quizCustomSetItems)
      .values({
        setId: id,
        itemType,
        itemId,
        customQuestion: customQuestion?.trim() || null,
        customAnswer: customAnswer?.trim() || null,
        sortOrder: nextOrder,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(newItem);
  } catch (error) {
    console.error('Add quiz item error:', error);
    return NextResponse.json({ error: 'Gagal menambah item' }, { status: 500 });
  }
}
