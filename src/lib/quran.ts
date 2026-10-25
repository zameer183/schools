export type Surah = {
  id: number;
  name: string;
  arabicName?: string;
  ayahs: number;
};

export const SURAH_LIST: Surah[] = [
  { id: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة', ayahs: 7 },
  { id: 2, name: 'Al-Baqarah', arabicName: 'البقرة', ayahs: 286 },
  { id: 3, name: 'Aal-E-Imran', arabicName: 'آل عمران', ayahs: 200 },
  { id: 4, name: 'An-Nisa', arabicName: 'النساء', ayahs: 176 },
  { id: 5, name: 'Al-Maidah', arabicName: 'المائدة', ayahs: 120 },
  { id: 6, name: 'Al-Anam', arabicName: 'الأنعام', ayahs: 165 },
  { id: 7, name: 'Al-Araf', arabicName: 'الأعراف', ayahs: 206 },
  { id: 8, name: 'Al-Anfal', arabicName: 'الأنفال', ayahs: 75 },
  { id: 9, name: 'At-Tawbah', arabicName: 'التوبة', ayahs: 129 },
  { id: 10, name: 'Yunus', arabicName: 'يونس', ayahs: 109 },
  { id: 11, name: 'Hud', arabicName: 'هود', ayahs: 123 },
  { id: 12, name: 'Yusuf', arabicName: 'يوسف', ayahs: 111 },
  { id: 13, name: 'Ar-Rad', arabicName: 'الرعد', ayahs: 43 },
  { id: 14, name: 'Ibrahim', arabicName: 'إبراهيم', ayahs: 52 },
  { id: 15, name: 'Al-Hijr', arabicName: 'الحجر', ayahs: 99 },
  { id: 16, name: 'An-Nahl', arabicName: 'النحل', ayahs: 128 },
  { id: 17, name: 'Al-Isra', arabicName: 'الإسراء', ayahs: 111 },
  { id: 18, name: 'Al-Kahf', arabicName: 'الكهف', ayahs: 110 },
  { id: 19, name: 'Maryam', arabicName: 'مريم', ayahs: 98 },
  { id: 20, name: 'Ta-Ha', arabicName: 'طه', ayahs: 135 },
  { id: 21, name: 'Al-Anbiya', arabicName: 'الأنبياء', ayahs: 112 },
  { id: 22, name: 'Al-Hajj', arabicName: 'الحج', ayahs: 78 },
  { id: 23, name: 'Al-Muminun', arabicName: 'المؤمنون', ayahs: 118 },
  { id: 24, name: 'An-Nur', arabicName: 'النور', ayahs: 64 },
  { id: 25, name: 'Al-Furqan', arabicName: 'الفرقان', ayahs: 77 },
  { id: 26, name: 'Ash-Shuara', arabicName: 'الشعراء', ayahs: 227 },
  { id: 27, name: 'An-Naml', arabicName: 'النمل', ayahs: 93 },
  { id: 28, name: 'Al-Qasas', arabicName: 'القصص', ayahs: 88 },
  { id: 29, name: 'Al-Ankabut', arabicName: 'العنكبوت', ayahs: 69 },
  { id: 30, name: 'Ar-Rum', arabicName: 'الروم', ayahs: 60 },
  { id: 31, name: 'Luqman', arabicName: 'لقمان', ayahs: 34 },
  { id: 32, name: 'As-Sajdah', arabicName: 'السجدة', ayahs: 30 },
  { id: 33, name: 'Al-Ahzab', arabicName: 'الأحزاب', ayahs: 73 },
  { id: 34, name: 'Saba', arabicName: 'سبأ', ayahs: 54 },
  { id: 35, name: 'Fatir', arabicName: 'فاطر', ayahs: 45 },
  { id: 36, name: 'Ya-Sin', arabicName: 'يس', ayahs: 83 },
  { id: 37, name: 'As-Saffat', arabicName: 'الصافات', ayahs: 182 },
  { id: 38, name: 'Sad', arabicName: 'ص', ayahs: 88 },
  { id: 39, name: 'Az-Zumar', arabicName: 'الزمر', ayahs: 75 },
  { id: 40, name: 'Ghafir', arabicName: 'غافر', ayahs: 85 },
  { id: 41, name: 'Fussilat', arabicName: 'فصلت', ayahs: 54 },
  { id: 42, name: 'Ash-Shura', arabicName: 'الشورى', ayahs: 53 },
  { id: 43, name: 'Az-Zukhruf', arabicName: 'الزخرف', ayahs: 89 },
  { id: 44, name: 'Ad-Dukhan', arabicName: 'الدخان', ayahs: 59 },
  { id: 45, name: 'Al-Jathiyah', arabicName: 'الجاثية', ayahs: 37 },
  { id: 46, name: 'Al-Ahqaf', arabicName: 'الأحقاف', ayahs: 35 },
  { id: 47, name: 'Muhammad', arabicName: 'محمد', ayahs: 38 },
  { id: 48, name: 'Al-Fath', arabicName: 'الفتح', ayahs: 29 },
  { id: 49, name: 'Al-Hujurat', arabicName: 'الحجرات', ayahs: 18 },
  { id: 50, name: 'Qaf', arabicName: 'ق', ayahs: 45 },
  { id: 51, name: 'Adh-Dhariyat', arabicName: 'الذاريات', ayahs: 60 },
  { id: 52, name: 'At-Tur', arabicName: 'الطور', ayahs: 49 },
  { id: 53, name: 'An-Najm', arabicName: 'النجم', ayahs: 62 },
  { id: 54, name: 'Al-Qamar', arabicName: 'القمر', ayahs: 55 },
  { id: 55, name: 'Ar-Rahman', arabicName: 'الرحمن', ayahs: 78 },
  { id: 56, name: 'Al-Waqiah', arabicName: 'الواقعة', ayahs: 96 },
  { id: 57, name: 'Al-Hadid', arabicName: 'الحديد', ayahs: 29 },
  { id: 58, name: 'Al-Mujadila', arabicName: 'المجادلة', ayahs: 22 },
  { id: 59, name: 'Al-Hashr', arabicName: 'الحشر', ayahs: 24 },
  { id: 60, name: 'Al-Mumtahanah', arabicName: 'الممتحنة', ayahs: 13 },
  { id: 61, name: 'As-Saff', arabicName: 'الصف', ayahs: 14 },
  { id: 62, name: 'Al-Jumuah', arabicName: 'الجمعة', ayahs: 11 },
  { id: 63, name: 'Al-Munafiqun', arabicName: 'المنافقون', ayahs: 11 },
  { id: 64, name: 'At-Taghabun', arabicName: 'التغابن', ayahs: 18 },
  { id: 65, name: 'At-Talaq', arabicName: 'الطلاق', ayahs: 12 },
  { id: 66, name: 'At-Tahrim', arabicName: 'التحريم', ayahs: 12 },
  { id: 67, name: 'Al-Mulk', arabicName: 'الملك', ayahs: 30 },
  { id: 68, name: 'Al-Qalam', arabicName: 'القلم', ayahs: 52 },
  { id: 69, name: 'Al-Haqqah', arabicName: 'الحاقة', ayahs: 52 },
  { id: 70, name: 'Al-Maarij', arabicName: 'المعارج', ayahs: 44 },
  { id: 71, name: 'Nuh', arabicName: 'نوح', ayahs: 28 },
  { id: 72, name: 'Al-Jinn', arabicName: 'الجن', ayahs: 28 },
  { id: 73, name: 'Al-Muzzammil', arabicName: 'المزمل', ayahs: 20 },
  { id: 74, name: 'Al-Muddaththir', arabicName: 'المدثر', ayahs: 56 },
  { id: 75, name: 'Al-Qiyamah', arabicName: 'القيامة', ayahs: 40 },
  { id: 76, name: 'Al-Insan', arabicName: 'الإنسان', ayahs: 31 },
  { id: 77, name: 'Al-Mursalat', arabicName: 'المرسلات', ayahs: 50 },
  { id: 78, name: 'An-Naba', arabicName: 'النبأ', ayahs: 40 },
  { id: 79, name: 'An-Naziat', arabicName: 'النازعات', ayahs: 46 },
  { id: 80, name: 'Abasa', arabicName: 'عبس', ayahs: 42 },
  { id: 81, name: 'At-Takwir', arabicName: 'التکویر', ayahs: 29 },
  { id: 82, name: 'Al-Infitar', arabicName: 'الانفطار', ayahs: 19 },
  { id: 83, name: 'Al-Mutaffifin', arabicName: 'المطففين', ayahs: 36 },
  { id: 84, name: 'Al-Inshiqaq', arabicName: 'الانشقاق', ayahs: 25 },
  { id: 85, name: 'Al-Buruj', arabicName: 'البروج', ayahs: 22 },
  { id: 86, name: 'At-Tariq', arabicName: 'الطارق', ayahs: 17 },
  { id: 87, name: 'Al-Ala', arabicName: 'الأعلى', ayahs: 19 },
  { id: 88, name: 'Al-Ghashiyah', arabicName: 'الغاشية', ayahs: 26 },
  { id: 89, name: 'Al-Fajr', arabicName: 'الفجر', ayahs: 30 },
  { id: 90, name: 'Al-Balad', arabicName: 'البلد', ayahs: 20 },
  { id: 91, name: 'Ash-Shams', arabicName: 'الشمس', ayahs: 15 },
  { id: 92, name: 'Al-Layl', arabicName: 'الليل', ayahs: 21 },
  { id: 93, name: 'Ad-Duha', arabicName: 'الضحى', ayahs: 11 },
  { id: 94, name: 'Ash-Sharh', arabicName: 'الشرح', ayahs: 8 },
  { id: 95, name: 'At-Tin', arabicName: 'التين', ayahs: 8 },
  { id: 96, name: 'Al-Alaq', arabicName: 'العلق', ayahs: 19 },
  { id: 97, name: 'Al-Qadr', arabicName: 'القدر', ayahs: 5 },
  { id: 98, name: 'Al-Bayyinah', arabicName: 'البينة', ayahs: 8 },
  { id: 99, name: 'Az-Zalzalah', arabicName: 'الزلزلة', ayahs: 8 },
  { id: 100, name: 'Al-Adiyat', arabicName: 'العاديات', ayahs: 11 },
  { id: 101, name: 'Al-Qariah', arabicName: 'القارعة', ayahs: 11 },
  { id: 102, name: 'At-Takathur', arabicName: 'التکاثر', ayahs: 8 },
  { id: 103, name: 'Al-Asr', arabicName: 'العصر', ayahs: 3 },
  { id: 104, name: 'Al-Humazah', arabicName: 'الهمزة', ayahs: 9 },
  { id: 105, name: 'Al-Fil', arabicName: 'الفيل', ayahs: 5 },
  { id: 106, name: 'Quraysh', arabicName: 'قريش', ayahs: 4 },
  { id: 107, name: 'Al-Maun', arabicName: 'الماعون', ayahs: 7 },
  { id: 108, name: 'Al-Kawthar', arabicName: 'الکوثر', ayahs: 3 },
  { id: 109, name: 'Al-Kafirun', arabicName: 'الکافرون', ayahs: 6 },
  { id: 110, name: 'An-Nasr', arabicName: 'النصر', ayahs: 3 },
  { id: 111, name: 'Al-Masad', arabicName: 'المسد', ayahs: 5 },
  { id: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', ayahs: 4 },
  { id: 113, name: 'Al-Falaq', arabicName: 'الفلق', ayahs: 5 },
  { id: 114, name: 'An-Nas', arabicName: 'الناس', ayahs: 6 }
];

export const SURAH_MAP = new Map<number, Surah>(SURAH_LIST.map((s) => [s.id, s]));

export function getSurahById(id: number | null | undefined): Surah | undefined {
  if (!id) return undefined;
  return SURAH_MAP.get(id);
}

export function resolveSurah(input: string): Surah | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const idMatch = trimmed.match(/^(\d{1,3})/);
  if (idMatch) {
    const id = Number(idMatch[1]);
    const byId = SURAH_MAP.get(id);
    if (byId) return byId;
  }

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SURAH_LIST.find((item) => {
    const sNorm = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return sNorm === normalized || sNorm.includes(normalized);
  });
}

export function validateAyahForSurah(
  surahId: number | null | undefined,
  ayahNumber: number | null | undefined
): { valid: boolean; error?: string } {
  if (!surahId) return { valid: false, error: 'Please select a Surah first.' };
  const surah = getSurahById(surahId);
  if (!surah) return { valid: false, error: `Invalid Surah ID: ${surahId}` };

  if (ayahNumber == null || !Number.isFinite(ayahNumber) || ayahNumber < 1) {
    return { valid: false, error: 'Ayah number must be at least 1.' };
  }

  if (ayahNumber > surah.ayahs) {
    return {
      valid: false,
      error: `سورت ${surah.name} میں کل ${surah.ayahs} آیات ہیں۔ آپ ${surah.ayahs} سے زیادہ آیت نمبر درج نہیں کر سکتے۔ (You can't add more than extreme value ${surah.ayahs})`
    };
  }

  return { valid: true };
}
