'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircle,
  ArrowLeft,
  Save,
  Search,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';

const PAGE_SIZE = 20;

type ItemType = 'vocabulary' | 'phrases';

interface SetItem {
  id: string;
  setId: string;
  itemType: ItemType;
  itemId: string;
  customQuestion: string | null;
  customAnswer: string | null;
  sortOrder: number;
  sourceText?: string;
  targetText?: string;
}

interface AvailableItem {
  id: string;
  word?: string;
  phrase?: string;
  translation: string;
  partOfSpeech?: string | null;
  difficulty?: string | null;
  isLearned: boolean;
  isFavorite: boolean;
  __itemType?: ItemType;
}

export default function QuizCustomCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'vocabulary' | 'phrases' | 'mixed'>('vocabulary');
  const [direction, setDirection] = useState<'source_to_target' | 'target_to_source' | 'mixed'>('source_to_target');
  const [questionType, setQuestionType] = useState<'type_in' | 'multiple_choice' | 'mixed'>('type_in');
  const [questionsPerSession, setQuestionsPerSession] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  // Items state
  const [items, setItems] = useState<SetItem[]>([]);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'unlearned' | 'favorite'>('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [itemSearchDebounced, setItemSearchDebounced] = useState('');

  const isEditing = !!editId;
  const [saving, setSaving] = useState(false);

  // Debounce item search
  useEffect(() => {
    const timer = setTimeout(() => {
      setItemSearchDebounced(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load set if editing
  useEffect(() => {
    if (editId) {
      loadSet(editId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const loadSet = async (id: string) => {
    try {
      const res = await fetch(`/api/quiz-custom/sets/${id}`);
      const data = await res.json();
      if (data) {
        setName(data.name);
        setDescription(data.description || '');
        setContentType(data.contentType);
        setDirection(data.direction);
        setQuestionType(data.questionType);
        setQuestionsPerSession(data.questionsPerSession || 0);
        setShuffleQuestions(data.shuffleQuestions);
        setShuffleOptions(data.shuffleOptions);
        setIsPublic(data.isPublic);
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load set:', error);
    }
  };

  const getItemType = (item: AvailableItem): ItemType =>
    item.__itemType || (contentType === 'phrases' ? 'phrases' : 'vocabulary');

  const getSourceText = (item: AvailableItem): string => {
    const type = getItemType(item);
    return type === 'vocabulary' ? item.word ?? '' : item.phrase ?? '';
  };

  // Build query params for available items (server-side search + pagination)
  const buildItemsQuery = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      params.set('sortOrder', 'asc');
      if (itemSearchDebounced) params.set('search', itemSearchDebounced);
      if (selectedType === 'unlearned') params.set('status', 'unlearned');
      if (selectedType === 'favorite') params.set('favorite', 'true');
      return params;
    },
    [itemSearchDebounced, selectedType]
  );

  const fetchPage = useCallback(
    async (offsets: { vocabulary: number; phrases: number }) => {
      const results: AvailableItem[] = [];
      let total = 0;
      let more = false;

      const fetchOne = async (base: ItemType) => {
        const params = buildItemsQuery(offsets[base]);
        params.set('sortBy', base === 'vocabulary' ? 'word' : 'phrase');
        const res = await fetch(`/api/${base}/search?${params.toString()}`);
        const json = await res.json();
        const data: any[] = json.data ?? [];
        return {
          data: data.map((d) => ({ ...d, __itemType: base })) as AvailableItem[],
          total: Number(json.total ?? 0),
          hasMore: Boolean(json.hasMore),
        };
      };

      if (contentType === 'vocabulary' || contentType === 'mixed') {
        const r = await fetchOne('vocabulary');
        results.push(...r.data);
        total += r.total;
        more = more || r.hasMore;
      }
      if (contentType === 'phrases' || contentType === 'mixed') {
        const r = await fetchOne('phrases');
        results.push(...r.data);
        total += r.total;
        more = more || r.hasMore;
      }

      return { data: results, total, hasMore: more };
    },
    [contentType, buildItemsQuery]
  );

  const loadAvailableItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const r = await fetchPage({ vocabulary: 0, phrases: 0 });
      setAvailableItems(r.data);
      setTotalAvailable(r.total);
      setHasMore(r.hasMore);
    } catch (error) {
      console.error('Failed to load available items:', error);
    } finally {
      setLoadingItems(false);
    }
  }, [fetchPage]);

  // Reload when search/filter/content type changes
  useEffect(() => {
    loadAvailableItems();
  }, [loadAvailableItems]);

  const loadMoreItems = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offsets = {
        vocabulary: availableItems.filter((i) => getItemType(i) === 'vocabulary').length,
        phrases: availableItems.filter((i) => getItemType(i) === 'phrases').length,
      };
      const r = await fetchPage(offsets);
      setAvailableItems((prev) => [...prev, ...r.data]);
      setHasMore(r.hasMore);
      setTotalAvailable(r.total);
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const isAdded = useCallback(
    (itemId: string, itemType: ItemType) =>
      items.some((i) => i.itemId === itemId && i.itemType === itemType),
    [items]
  );

  const itemKey = (item: AvailableItem) => `${getItemType(item)}:${item.id}`;

  const toggleSelect = (item: AvailableItem) => {
    const key = itemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Tambahkan semua item yang dicentang sekaligus
  const addSelected = () => {
    const toAdd: SetItem[] = [];
    selectedKeys.forEach((key) => {
      const sepIdx = key.indexOf(':');
      const itemType = key.slice(0, sepIdx) as ItemType;
      const itemId = key.slice(sepIdx + 1);
      if (items.some((i) => i.itemType === itemType && i.itemId === itemId)) return;
      if (toAdd.some((i) => i.itemType === itemType && i.itemId === itemId)) return;
      const source = availableItems.find((a) => a.id === itemId);
      toAdd.push({
        id: crypto.randomUUID(),
        setId: editId || '',
        itemType,
        itemId,
        customQuestion: null,
        customAnswer: null,
        sortOrder: 0,
        sourceText: source
          ? itemType === 'vocabulary'
            ? source.word ?? ''
            : source.phrase ?? ''
          : '',
        targetText: source?.translation ?? '',
      });
    });
    if (toAdd.length > 0) {
      setItems((prev) => [...prev, ...toAdd].map((item, i) => ({ ...item, sortOrder: i })));
    }
    setSelectedKeys(new Set());
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId).map((item, i) => ({ ...item, sortOrder: i })));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const newItems = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newItems.length) return prev;
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      return newItems.map((item, i) => ({ ...item, sortOrder: i }));
    });
  };

  const updateCustomField = (itemId: string, field: 'customQuestion' | 'customAnswer', value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: value.trim() || null } : item
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Nama kuis wajib diisi');
      return;
    }
    if (items.length === 0) {
      alert('Tambahkan minimal 1 soal');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        contentType,
        direction,
        questionType,
        questionsPerSession,
        shuffleQuestions,
        shuffleOptions,
        isPublic,
      };

      let setId = editId;

      if (isEditing && setId) {
        const res = await fetch(`/api/quiz-custom/sets/${setId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Gagal memperbarui kuis');
      } else {
        const res = await fetch('/api/quiz-custom/sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Gagal membuat kuis');
        const data = await res.json();
        setId = data.id;
      }

      // Simpan seluruh soal dalam SATU request (bulk replace)
      if (setId) {
        const res = await fetch(`/api/quiz-custom/sets/${setId}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((item) => ({
              itemType: item.itemType,
              itemId: item.itemId,
              customQuestion: item.customQuestion,
              customAnswer: item.customAnswer,
            })),
          }),
        });
        if (!res.ok) throw new Error('Gagal menyimpan soal');
      }

      router.push('/quiz-custom');
    } catch (error) {
      console.error('Save failed:', error);
      alert(error instanceof Error ? error.message : 'Gagal menyimpan kuis');
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (type: string) => {
    if (type === 'vocabulary') return 'Kata';
    if (type === 'phrases') return 'Kalimat';
    return 'Kata/Kalimat';
  };

  // Available items yang belum ditambahkan
  const filteredAvailableItems = availableItems.filter(
    (item) => !isAdded(item.id, getItemType(item))
  );
  const selectedCount = selectedKeys.size;

  return (
    <div className="max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Link
          href="/quiz-custom"
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditing ? '✏️ Edit Kuis' : '➕ Buat Kuis Baru'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Pilih kata/kalimat bebas dari database, lalu atur pengaturan kuis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: FORM SETTINGS */}
        <div className="xl:col-span-1 space-y-4">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">📝 Info Dasar</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kuis *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Review Mingguan - Kata Kerja"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opsional: catatan tentang kuis ini..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Content Settings */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">⚙️ Pengaturan Konten</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe Konten</label>
                <div className="flex gap-2">
                  {(['vocabulary', 'phrases', 'mixed'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setContentType(type)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        contentType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type === 'vocabulary' ? '📚 Kosakata' : type === 'phrases' ? '💬 Kalimat' : '🔀 Campuran'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arah Soal</label>
                <div className="flex gap-2">
                  {(['source_to_target', 'target_to_source', 'mixed'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setDirection(dir)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        direction === dir
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {dir === 'source_to_target' ? 'EN → ID' : dir === 'target_to_source' ? 'ID → EN' : 'Campur'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {direction === 'source_to_target' && 'Soal: English, Jawab: Indonesia'}
                  {direction === 'target_to_source' && 'Soal: Indonesia, Jawab: English (type-in)'}
                  {direction === 'mixed' && 'Acak arah soal'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe Pertanyaan</label>
                <div className="flex gap-2">
                  {(['type_in', 'multiple_choice', 'mixed'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setQuestionType(type)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        questionType === type
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type === 'type_in' ? '⌨️ Input Manual' : type === 'multiple_choice' ? '☑️ Pilihan Ganda' : '🔀 Campur'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Soal per Sesi (0 = semua)
                </label>
                <input
                  type="number"
                  min="0"
                  value={questionsPerSession}
                  onChange={(e) => setQuestionsPerSession(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Acak urutan soal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Acak opsi (MC)</span>
                </label>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Publik — user lain bisa lihat & kerjakan kuis ini</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Jika dicentang, kuis akan muncul di halaman JELAJAH KUIS PUBLIK dan siapa saja bisa memainkannya.
                </p>
              </label>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : isEditing ? 'Update Kuis' : 'Buat Kuis'}
          </button>
        </div>

        {/* RIGHT: ITEM SELECTION */}
        <div className="xl:col-span-2 space-y-4">
          {/* SELECTED ITEMS */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                📋 Soal Terpilih ({items.length})
              </h2>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-sm text-red-600 hover:underline">
                  Hapus Semua
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <p className="mb-2">Belum ada soal</p>
                <p className="text-sm">Centang kata/kalimat di daftar bawah, lalu klik “Tambah Terpilih”</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map((item, index) => {
                  const found = availableItems.find(
                    (i) => i.id === item.itemId && getItemType(i) === item.itemType
                  );
                  const sourceText = item.sourceText || (found ? getSourceText(found) : '');
                  const targetText = item.targetText || found?.translation || '...';

                  return (
                    <div
                      key={item.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 text-gray-400">
                          <button
                            onClick={() => moveItem(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{index + 1}</span>
                          <button
                            onClick={() => moveItem(index, 'down')}
                            disabled={index === items.length - 1}
                            className="p-1 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                              {item.itemType === 'vocabulary' ? '📚' : '💬'}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white truncate block">
                              {item.customQuestion || sourceText}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Jawaban: <span className="font-medium">{item.customAnswer || targetText}</span>
                          </div>
                          {/* Custom fields */}
                          <div className="mt-2 space-y-1">
                            <input
                              type="text"
                              placeholder="Custom soal (opsional)"
                              value={item.customQuestion || ''}
                              onChange={(e) => updateCustomField(item.id, 'customQuestion', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Custom jawaban (opsional)"
                              value={item.customAnswer || ''}
                              onChange={(e) => updateCustomField(item.id, 'customAnswer', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition"
                          title="Hapus soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AVAILABLE ITEMS */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                📚 Pilih {getTypeLabel(contentType)}{' '}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  (Total: {totalAvailable})
                </span>
              </h2>
              <button
                onClick={addSelected}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Terpilih ({selectedCount})
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Cari ${getTypeLabel(contentType).toLowerCase()} atau arti...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {(['all', 'unlearned', 'favorite'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition ${
                      selectedType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {type === 'all' ? 'Semua' : type === 'unlearned' ? '📖 Belum Hafal' : '⭐ Favorit'}
                  </button>
                ))}
              </div>
            </div>

            {loadingItems ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin inline" /> Memuat...
              </div>
            ) : filteredAvailableItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Tidak ada item yang cocok.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {filteredAvailableItems.map((item) => {
                    const key = itemKey(item);
                    const isSelected = selectedKeys.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleSelect(item)}
                        className={`text-left p-3 border rounded-lg transition flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white truncate block">
                                {getSourceText(item)}
                              </span>
                              {item.difficulty && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    item.difficulty === 'beginner'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                      : item.difficulty === 'intermediate'
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                  }`}
                                >
                                  {item.difficulty}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {item.translation}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.isLearned && <span className="text-green-500 text-sm">✅</span>}
                          {item.isFavorite && <span className="text-yellow-500 text-sm">⭐</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="text-center mt-4">
                    <button
                      onClick={loadMoreItems}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition disabled:opacity-50"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
