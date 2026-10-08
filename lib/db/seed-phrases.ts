import { db } from './index';
import { phrases } from './schema';
import 'dotenv/config';

const seedPhrases = [
  { phrase: 'good morning', translation: 'selamat pagi', phonetic: '/ɡʊd ˈmɔːrnɪŋ/', category: 'greeting' },
  { phrase: 'good afternoon', translation: 'selamat sore', phonetic: '/ɡʊd ˌæftərˈnuːn/', category: 'greeting' },
  { phrase: 'good evening', translation: 'selamat malam', phonetic: '/ɡʊd ˈiːvnɪŋ/', category: 'greeting' },
  { phrase: 'good night', translation: 'selamat tidur', phonetic: '/ɡʊd naɪt/', category: 'greeting' },
  { phrase: 'how are you?', translation: 'apa kabar?', phonetic: '/haʊ ɑːr juː/', category: 'greeting' },
  { phrase: 'I\'m fine, thank you', translation: 'saya baik, terima kasih', phonetic: '/aɪm faɪn θæŋk juː/', category: 'greeting' },
  { phrase: 'what is your name?', translation: 'siapa nama anda?', phonetic: '/wɒt ɪz jɔːr neɪm/', category: 'question' },
  { phrase: 'my name is...', translation: 'nama saya...', phonetic: '/maɪ neɪm ɪz/', category: 'introduction' },
  { phrase: 'nice to meet you', translation: 'senang berkenalan dengan anda', phonetic: '/naɪs tuː miːt juː/', category: 'introduction' },
  { phrase: 'where are you from?', translation: 'dari mana anda berasal?', phonetic: '/weər ɑːr juː frɒm/', category: 'question' },
  { phrase: 'I am from...', translation: 'saya dari...', phonetic: '/aɪ æm frɒm/', category: 'introduction' },
  { phrase: 'how old are you?', translation: 'berapa usia anda?', phonetic: '/haʊ oʊld ɑːr juː/', category: 'question' },
  { phrase: 'I am ... years old', translation: 'saya berumur ... tahun', phonetic: '/aɪ æm ... jɪərz oʊld/', category: 'introduction' },
  { phrase: 'what do you do?', translation: 'apa pekerjaan anda?', phonetic: '/wɒt duː juː duː/', category: 'question' },
  { phrase: 'I am a student', translation: 'saya seorang pelajar', phonetic: '/aɪ æm ə ˈstuːdənt/', category: 'job' },
  { phrase: 'I am a teacher', translation: 'saya seorang guru', phonetic: '/aɪ æm ə ˈtiːtʃər/', category: 'job' },
  { phrase: 'I am a doctor', translation: 'saya seorang dokter', phonetic: '/aɪ æm ə ˈdɑːktər/', category: 'job' },
  { phrase: 'I am a nurse', translation: 'saya seorang perawat', phonetic: '/aɪ æm ə nɜːrs/', category: 'job' },
  { phrase: 'I am an engineer', translation: 'saya seorang insinyur', phonetic: '/aɪ æm ən ˌendʒɪˈnɪr/', category: 'job' },
  { phrase: 'can you help me?', translation: 'bisakah anda membantu saya?', phonetic: '/kæn juː help miː/', category: 'request' },
  { phrase: 'of course', translation: 'tentu saja', phonetic: '/ʌv kɔːrs/', category: 'response' },
  { phrase: 'thank you very much', translation: 'terima kasih banyak', phonetic: '/θæŋk juː ˈveri mʌtʃ/', category: 'gratitude' },
  { phrase: 'you\'re welcome', translation: 'sama-sama', phonetic: '/jʊər ˈwelkəm/', category: 'response' },
  { phrase: 'excuse me', translation: 'permisi', phonetic: '/ɪkˈskjuːz miː/', category: 'polite' },
  { phrase: 'I\'m sorry', translation: 'maaf', phonetic: '/aɪm ˈsɑːri/', category: 'apology' },
  { phrase: 'I apologize', translation: 'saya minta maaf', phonetic: '/aɪ əˈpɑːlədʒaɪz/', category: 'apology' },
  { phrase: 'it\'s okay', translation: 'tidak apa-apa', phonetic: '/ɪts oʊˈkeɪ/', category: 'response' },
  { phrase: 'what time is it?', translation: 'jam berapa sekarang?', phonetic: '/wɒt taɪm ɪz ɪt/', category: 'question' },
  { phrase: 'it\'s 10 o\'clock', translation: 'jam 10', phonetic: '/ɪts ten əˈklɑːk/', category: 'time' },
  { phrase: 'it\'s half past two', translation: 'jam setengah tiga', phonetic: '/ɪts hæf pæst tuː/', category: 'time' },
  { phrase: 'it\'s quarter to three', translation: 'jam tiga kurang 15 menit', phonetic: '/ɪts ˈkwɔːrtər tuː θriː/', category: 'time' },
  { phrase: 'what day is it today?', translation: 'hari apa hari ini?', phonetic: '/wɒt deɪ ɪz ɪt təˈdeɪ/', category: 'question' },
  { phrase: 'today is Monday', translation: 'hari ini Senin', phonetic: '/təˈdeɪ ɪz ˈmʌndeɪ/', category: 'day' },
  { phrase: 'today is Tuesday', translation: 'hari ini Selasa', phonetic: '/təˈdeɪ ɪz ˈtuːzdeɪ/', category: 'day' },
  { phrase: 'today is Wednesday', translation: 'hari ini Rabu', phonetic: '/təˈdeɪ ɪz ˈwɛnzdeɪ/', category: 'day' },
  { phrase: 'today is Thursday', translation: 'hari ini Kamis', phonetic: '/təˈdeɪ ɪz ˈθɜːrzdeɪ/', category: 'day' },
  { phrase: 'today is Friday', translation: 'hari ini Jumat', phonetic: '/təˈdeɪ ɪz ˈfraɪdeɪ/', category: 'day' },
  { phrase: 'today is Saturday', translation: 'hari ini Sabtu', phonetic: '/təˈdeɪ ɪz ˈsætərdeɪ/', category: 'day' },
  { phrase: 'today is Sunday', translation: 'hari ini Minggu', phonetic: '/təˈdeɪ ɪz ˈsʌndeɪ/', category: 'day' },
  { phrase: 'happy birthday', translation: 'selamat ulang tahun', phonetic: '/ˈhæpi ˈbɜːrθdeɪ/', category: 'greeting' },
  { phrase: 'happy new year', translation: 'selamat tahun baru', phonetic: '/ˈhæpi nuː jɪr/', category: 'greeting' },
  { phrase: 'merry christmas', translation: 'selamat natal', phonetic: '/ˈmeri ˈkrɪsməs/', category: 'greeting' },
  { phrase: 'congratulations', translation: 'selamat', phonetic: '/kənˌɡrætʃəˈleɪʃənz/', category: 'greeting' },
  { phrase: 'good luck', translation: 'semoga berhasil', phonetic: '/ɡʊd lʌk/', category: 'wish' },
  { phrase: 'take care', translation: 'hati-hati', phonetic: '/teɪk ker/', category: 'wish' },
  { phrase: 'see you later', translation: 'sampai jumpa', phonetic: '/siː juː ˈleɪtər/', category: 'farewell' },
  { phrase: 'see you tomorrow', translation: 'sampai jumpa besok', phonetic: '/siː juː təˈmɒroʊ/', category: 'farewell' },
];

async function main() {
  console.log('🌱 Seeding phrases...');
  let inserted = 0;
  for (const item of seedPhrases) {
    try {
      await db.insert(phrases).values(item).onConflictDoNothing();
      inserted++;
    } catch (e) {
      console.error(`❌ Gagal insert phrase "${item.phrase}":`, e);
    }
  }
  console.log(`✅ Seeding phrases complete! ${inserted} phrases added.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});