import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, vocabulary, userVocabulary, vocabularyForms } from '@/lib/db';
import { eq, and, or, ilike, sql, desc, asc, inArray, isNull } from 'drizzle-orm';
import { partOfSpeechEnum, difficultyEnum } from '@/lib/db/schema';

const VALID_PARTS_OF_SPEECH = partOfSpeechEnum.enumValues;
const VALID_DIFFICULTIES = difficultyEnum.enumValues;
const MAX_LIMIT = 100;

interface WordFormRow {
  id: string;
  form: string;
  partOfSpeech: string | null;
  translation: string | null;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const partOfSpeech = searchParams.get('partOfSpeech') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const status = searchParams.get('status') || 'all'; // all, learned, unlearned
  const favorite = searchParams.get('favorite') === 'true';
  const tag = searchParams.get('tag') || '';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const sortBy = searchParams.get('sortBy') || 'relevance';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Build where conditions
  const conditions = [];

  const likeTerm = `%${search.toLowerCase()}%`;
  const prefixTerm = `${search.toLowerCase()}%`;

  if (search) {
    // Pencarian di kata Inggris (word), terjemahannya (translation),
    // DAN bentuk kata terkait (vocabulary_forms.form) — mis. cari "act"
    // menemukan "action" lewat bentuk verb-nya.
    // EXISTS (bukan JOIN) agar tidak menduplikasi row.
    conditions.push(
      or(
        ilike(vocabulary.word, likeTerm),
        ilike(vocabulary.translation, likeTerm),
        sql`EXISTS (SELECT 1 FROM vocabulary_forms vf WHERE vf.vocabulary_id = ${vocabulary.id} AND lower(vf.form) LIKE ${likeTerm})`
      )
    );
  }

  // Handle multiple partOfSpeech values (comma-separated)
  if (partOfSpeech) {
    const parts = partOfSpeech.split(',').filter(Boolean);
    const validParts = parts.filter(p => VALID_PARTS_OF_SPEECH.includes(p as any));
    if (validParts.length === 1) {
      conditions.push(eq(vocabulary.partOfSpeech, validParts[0] as any));
    } else if (validParts.length > 1) {
      conditions.push(inArray(vocabulary.partOfSpeech, validParts as any));
    }
  }

  // Handle multiple difficulty values (comma-separated)
  if (difficulty) {
    const diffs = difficulty.split(',').filter(Boolean);
    const validDiffs = diffs.filter(d => VALID_DIFFICULTIES.includes(d as any));
    if (validDiffs.length === 1) {
      conditions.push(eq(vocabulary.difficulty, validDiffs[0] as any));
    } else if (validDiffs.length > 1) {
      conditions.push(inArray(vocabulary.difficulty, validDiffs as any));
    }
  }

  // Tag filter (array contains)
  if (tag) {
    conditions.push(sql`${vocabulary.tags} @> ARRAY[${tag}]::text[]`);
  }

  // Build user vocabulary join for flags
  const userVocabJoin = and(
    eq(userVocabulary.vocabularyId, vocabulary.id),
    eq(userVocabulary.userId, session.user.id)
  );

  // Status filter (learned/unlearned) - needs user_vocabulary join
  if (status !== 'all') {
    conditions.push(
      status === 'learned'
        ? eq(userVocabulary.isLearned, true)
        : or(
            eq(userVocabulary.isLearned, false),
            isNull(userVocabulary.isLearned)
          )
    );
  }

  // Filter favorit saja
  if (favorite) {
    conditions.push(eq(userVocabulary.isFavorite, true));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Ranking: exact match > prefix > substring (hanya pada kata Inggris).
  // Match di bentuk kata (vocabulary_forms) mendapat skor lebih rendah.
  const rankingExpr = search
    ? sql`(
        CASE
          WHEN lower(${vocabulary.word}) = lower(${search}) THEN 100
          WHEN lower(${vocabulary.word}) LIKE ${prefixTerm} THEN 50
          WHEN lower(${vocabulary.word}) LIKE ${likeTerm} THEN 25
          WHEN EXISTS (SELECT 1 FROM vocabulary_forms vf WHERE vf.vocabulary_id = ${vocabulary.id} AND lower(vf.form) = lower(${search})) THEN 15
          WHEN EXISTS (SELECT 1 FROM vocabulary_forms vf WHERE vf.vocabulary_id = ${vocabulary.id} AND lower(vf.form) LIKE ${prefixTerm}) THEN 10
          WHEN EXISTS (SELECT 1 FROM vocabulary_forms vf WHERE vf.vocabulary_id = ${vocabulary.id} AND lower(vf.form) LIKE ${likeTerm}) THEN 5
          ELSE 0
        END
      )`
    : sql`0`;

  // Order by
  let orderBy;
  if (sortBy === 'relevance' && search) {
    orderBy = [
      desc(rankingExpr),
      asc(sql`LENGTH(${vocabulary.word})`),
      asc(vocabulary.word),
    ];
  } else {
    const orderByCol = sortBy === 'word' ? vocabulary.word : vocabulary.createdAt;
    orderBy = sortOrder === 'desc' ? desc(orderByCol) : asc(orderByCol);
  }

  // 1 query saja: data + total (window function) → 2x lebih cepat
  // daripada query data + query count terpisah.
  const rows = await db
    .select({
      id: vocabulary.id,
      word: vocabulary.word,
      translation: vocabulary.translation,
      definition: vocabulary.definition,
      partOfSpeech: vocabulary.partOfSpeech,
      difficulty: vocabulary.difficulty,
      exampleSentence: vocabulary.exampleSentence,
      phonetic: vocabulary.phonetic,
      v1: vocabulary.v1,
      v2: vocabulary.v2,
      v3: vocabulary.v3,
      v_ing: vocabulary.v_ing,
      v_s: vocabulary.v_s,
      plural_form: vocabulary.plural_form,
      synonyms: vocabulary.synonyms,
      antonyms: vocabulary.antonyms,
      notes: vocabulary.notes,
      tags: vocabulary.tags,
      isFavorite: userVocabulary.isFavorite,
      isLearned: userVocabulary.isLearned,
      total: sql<number>`count(*) over()`,
      ...(search ? { relevance: rankingExpr } : {}),
    })
    .from(vocabulary)
    .leftJoin(userVocabulary, userVocabJoin)
    .where(whereClause)
    .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
    .limit(limit)
    .offset(offset);

  const total = rows.length > 0 ? Number(rows[0].total ?? 0) : offset;

  // Ambil bentuk kata terkait untuk semua row hasil (1 query tambahan, ter-index)
  const vocabIds = rows.map(r => r.id);
  const formsByVocab = new Map<string, WordFormRow[]>();
  if (vocabIds.length > 0) {
    const formRows = await db
      .select({
        vocabularyId: vocabularyForms.vocabularyId,
        id: vocabularyForms.id,
        form: vocabularyForms.form,
        partOfSpeech: vocabularyForms.partOfSpeech,
        translation: vocabularyForms.translation,
      })
      .from(vocabularyForms)
      .where(inArray(vocabularyForms.vocabularyId, vocabIds))
      .orderBy(vocabularyForms.createdAt);
    for (const fr of formRows) {
      const list = formsByVocab.get(fr.vocabularyId) ?? [];
      list.push({ id: fr.id, form: fr.form, partOfSpeech: fr.partOfSpeech, translation: fr.translation });
      formsByVocab.set(fr.vocabularyId, list);
    }
  }

  return NextResponse.json({
    data: rows.map(({ total: _t, ...r }) => ({
      ...r,
      isFavorite: r.isFavorite ?? false,
      isLearned: r.isLearned ?? false,
      forms: formsByVocab.get(r.id) ?? [],
    })),
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  });
}