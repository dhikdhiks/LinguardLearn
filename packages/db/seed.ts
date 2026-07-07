import { db } from './index';
import { vocabulary } from './schema';
import 'dotenv/config';

const seedVocabulary = [
  { word: 'hello', translation: 'halo', definition: 'salam sapaan', partOfSpeech: 'interjection', difficulty: 'beginner' },
  { word: 'goodbye', translation: 'selamat tinggal', definition: 'ungkapan perpisahan', partOfSpeech: 'interjection', difficulty: 'beginner' },
  { word: 'thank you', translation: 'terima kasih', definition: 'ungkapan terima kasih', partOfSpeech: 'interjection', difficulty: 'beginner' },
  { word: 'please', translation: 'tolong', definition: 'kata permohonan', partOfSpeech: 'interjection', difficulty: 'beginner' },
  { word: 'yes', translation: 'ya', definition: 'persetujuan', partOfSpeech: 'interjection', difficulty: 'beginner' },
  { word: 'no', translation: 'tidak', definition: 'penolakan', partOfSpeech: 'interjection', difficulty: 'beginner' },
  { word: 'apple', translation: 'apel', definition: 'buah apel', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'book', translation: 'buku', definition: 'kumpulan lembaran kertas berisi tulisan', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'car', translation: 'mobil', definition: 'kendaraan roda empat', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'cat', translation: 'kucing', definition: 'hewan peliharaan', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'dog', translation: 'anjing', definition: 'hewan peliharaan', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'friend', translation: 'teman', definition: 'orang yang dikenal', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'house', translation: 'rumah', definition: 'tempat tinggal', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'love', translation: 'cinta', definition: 'perasaan sayang', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'water', translation: 'air', definition: 'cairan tak berwarna', partOfSpeech: 'noun', difficulty: 'beginner' },
  { word: 'run', translation: 'lari', definition: 'bergerak cepat dengan kaki', partOfSpeech: 'verb', difficulty: 'beginner' },
  { word: 'eat', translation: 'makan', definition: 'memasukkan makanan ke mulut', partOfSpeech: 'verb', difficulty: 'beginner' },
  { word: 'sleep', translation: 'tidur', definition: 'istirahat dengan mata tertutup', partOfSpeech: 'verb', difficulty: 'beginner' },
  { word: 'learn', translation: 'belajar', definition: 'mendapatkan pengetahuan', partOfSpeech: 'verb', difficulty: 'intermediate' },
  { word: 'teach', translation: 'mengajar', definition: 'memberi pengetahuan', partOfSpeech: 'verb', difficulty: 'intermediate' },
  { word: 'beautiful', translation: 'cantik', definition: 'indah dipandang', partOfSpeech: 'adjective', difficulty: 'intermediate' },
  { word: 'big', translation: 'besar', definition: 'berukuran besar', partOfSpeech: 'adjective', difficulty: 'beginner' },
  { word: 'small', translation: 'kecil', definition: 'berukuran kecil', partOfSpeech: 'adjective', difficulty: 'beginner' },
  { word: 'happy', translation: 'bahagia', definition: 'merasa senang', partOfSpeech: 'adjective', difficulty: 'beginner' },
  { word: 'sad', translation: 'sedih', definition: 'merasa tidak senang', partOfSpeech: 'adjective', difficulty: 'beginner' },
  { word: 'quickly', translation: 'dengan cepat', definition: 'berkecepatan tinggi', partOfSpeech: 'adverb', difficulty: 'intermediate' },
  { word: 'slowly', translation: 'dengan lambat', definition: 'berkecepatan rendah', partOfSpeech: 'adverb', difficulty: 'intermediate' },
];

async function main() {
  console.log('🌱 Seeding vocabulary...');
  let inserted = 0;
  for (const item of seedVocabulary) {
    try {
      await db.insert(vocabulary).values(item).onConflictDoNothing();
      inserted++;
    } catch (e) {
      console.error(`❌ Gagal insert "${item.word}":`, e);
    }
  }
  console.log(`✅ Seeding complete! ${inserted} kata berhasil ditambahkan.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});