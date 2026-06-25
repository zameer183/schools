'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarDays, Search, Sparkles, Star, TrendingUp } from 'lucide-react';

type ClassItem = { id: string; name: string; section: string };
type StudentItem = {
  id: string;
  admissionNo: string;
  user: { fullName: string; email: string };
  class: null | { id?: string; name: string; section: string };
};

type ProgressItem = {
  id: string;
  date: string;
  notes: string | null;
  studentId: string;
  classId: string;
  student: { id: string; admissionNo?: string; user: { fullName: string } };
  class: { id: string; name: string; section: string };
};

type SectionKey = 'sabaq' | 'sabqi' | 'manzil';
type KaifiyatValue = 'Excellent ⭐⭐⭐⭐⭐' | 'Good ⭐⭐⭐⭐' | 'Average ⭐⭐⭐' | 'Weak ⭐⭐' | '';

type SurahRangeForm = {
  id?: string;
  surahInput: string;
  surahId: number | null;
  fromAyah: string;
  toAyah: string;
};

type SectionForm = {
  ranges: SurahRangeForm[];
  kaifiyat: KaifiyatValue;
  tajweeditotal: string; // exact count 0-99
  hifztotal: string;     // exact count 0-99
};

type ParsedSurahRange = {
  surahId: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
};

type ParsedSection = {
  ranges: ParsedSurahRange[];
  kaifiyat: Exclude<KaifiyatValue, ''> | '';
  tajweeditotal: number;
  hifztotal: number;
};

type ParsedReport = {
  sections: Record<SectionKey, ParsedSection>;
  overall: string;
  totalMistakes: number;
  suggestion: string;
};

type NotificationItem = {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
};

type Surah = { id: number; name: string; ayahs: number };

const SURAH_LIST: Surah[] = [
  { id: 1, name: 'Al-Fatihah', ayahs: 7 },
  { id: 2, name: 'Al-Baqarah', ayahs: 286 },
  { id: 3, name: 'Aal-E-Imran', ayahs: 200 },
  { id: 4, name: 'An-Nisa', ayahs: 176 },
  { id: 5, name: 'Al-Maidah', ayahs: 120 },
  { id: 6, name: 'Al-Anam', ayahs: 165 },
  { id: 7, name: 'Al-Araf', ayahs: 206 },
  { id: 8, name: 'Al-Anfal', ayahs: 75 },
  { id: 9, name: 'At-Tawbah', ayahs: 129 },
  { id: 10, name: 'Yunus', ayahs: 109 },
  { id: 11, name: 'Hud', ayahs: 123 },
  { id: 12, name: 'Yusuf', ayahs: 111 },
  { id: 13, name: 'Ar-Rad', ayahs: 43 },
  { id: 14, name: 'Ibrahim', ayahs: 52 },
  { id: 15, name: 'Al-Hijr', ayahs: 99 },
  { id: 16, name: 'An-Nahl', ayahs: 128 },
  { id: 17, name: 'Al-Isra', ayahs: 111 },
  { id: 18, name: 'Al-Kahf', ayahs: 110 },
  { id: 19, name: 'Maryam', ayahs: 98 },
  { id: 20, name: 'Ta-Ha', ayahs: 135 },
  { id: 21, name: 'Al-Anbiya', ayahs: 112 },
  { id: 22, name: 'Al-Hajj', ayahs: 78 },
  { id: 23, name: 'Al-Muminun', ayahs: 118 },
  { id: 24, name: 'An-Nur', ayahs: 64 },
  { id: 25, name: 'Al-Furqan', ayahs: 77 },
  { id: 26, name: 'Ash-Shuara', ayahs: 227 },
  { id: 27, name: 'An-Naml', ayahs: 93 },
  { id: 28, name: 'Al-Qasas', ayahs: 88 },
  { id: 29, name: 'Al-Ankabut', ayahs: 69 },
  { id: 30, name: 'Ar-Rum', ayahs: 60 },
  { id: 31, name: 'Luqman', ayahs: 34 },
  { id: 32, name: 'As-Sajdah', ayahs: 30 },
  { id: 33, name: 'Al-Ahzab', ayahs: 73 },
  { id: 34, name: 'Saba', ayahs: 54 },
  { id: 35, name: 'Fatir', ayahs: 45 },
  { id: 36, name: 'Ya-Sin', ayahs: 83 },
  { id: 37, name: 'As-Saffat', ayahs: 182 },
  { id: 38, name: 'Sad', ayahs: 88 },
  { id: 39, name: 'Az-Zumar', ayahs: 75 },
  { id: 40, name: 'Ghafir', ayahs: 85 },
  { id: 41, name: 'Fussilat', ayahs: 54 },
  { id: 42, name: 'Ash-Shura', ayahs: 53 },
  { id: 43, name: 'Az-Zukhruf', ayahs: 89 },
  { id: 44, name: 'Ad-Dukhan', ayahs: 59 },
  { id: 45, name: 'Al-Jathiyah', ayahs: 37 },
  { id: 46, name: 'Al-Ahqaf', ayahs: 35 },
  { id: 47, name: 'Muhammad', ayahs: 38 },
  { id: 48, name: 'Al-Fath', ayahs: 29 },
  { id: 49, name: 'Al-Hujurat', ayahs: 18 },
  { id: 50, name: 'Qaf', ayahs: 45 },
  { id: 51, name: 'Adh-Dhariyat', ayahs: 60 },
  { id: 52, name: 'At-Tur', ayahs: 49 },
  { id: 53, name: 'An-Najm', ayahs: 62 },
  { id: 54, name: 'Al-Qamar', ayahs: 55 },
  { id: 55, name: 'Ar-Rahman', ayahs: 78 },
  { id: 56, name: 'Al-Waqiah', ayahs: 96 },
  { id: 57, name: 'Al-Hadid', ayahs: 29 },
  { id: 58, name: 'Al-Mujadila', ayahs: 22 },
  { id: 59, name: 'Al-Hashr', ayahs: 24 },
  { id: 60, name: 'Al-Mumtahanah', ayahs: 13 },
  { id: 61, name: 'As-Saff', ayahs: 14 },
  { id: 62, name: 'Al-Jumuah', ayahs: 11 },
  { id: 63, name: 'Al-Munafiqun', ayahs: 11 },
  { id: 64, name: 'At-Taghabun', ayahs: 18 },
  { id: 65, name: 'At-Talaq', ayahs: 12 },
  { id: 66, name: 'At-Tahrim', ayahs: 12 },
  { id: 67, name: 'Al-Mulk', ayahs: 30 },
  { id: 68, name: 'Al-Qalam', ayahs: 52 },
  { id: 69, name: 'Al-Haqqah', ayahs: 52 },
  { id: 70, name: 'Al-Maarij', ayahs: 44 },
  { id: 71, name: 'Nuh', ayahs: 28 },
  { id: 72, name: 'Al-Jinn', ayahs: 28 },
  { id: 73, name: 'Al-Muzzammil', ayahs: 20 },
  { id: 74, name: 'Al-Muddaththir', ayahs: 56 },
  { id: 75, name: 'Al-Qiyamah', ayahs: 40 },
  { id: 76, name: 'Al-Insan', ayahs: 31 },
  { id: 77, name: 'Al-Mursalat', ayahs: 50 },
  { id: 78, name: 'An-Naba', ayahs: 40 },
  { id: 79, name: 'An-Naziat', ayahs: 46 },
  { id: 80, name: 'Abasa', ayahs: 42 },
  { id: 81, name: 'At-Takwir', ayahs: 29 },
  { id: 82, name: 'Al-Infitar', ayahs: 19 },
  { id: 83, name: 'Al-Mutaffifin', ayahs: 36 },
  { id: 84, name: 'Al-Inshiqaq', ayahs: 25 },
  { id: 85, name: 'Al-Buruj', ayahs: 22 },
  { id: 86, name: 'At-Tariq', ayahs: 17 },
  { id: 87, name: 'Al-Ala', ayahs: 19 },
  { id: 88, name: 'Al-Ghashiyah', ayahs: 26 },
  { id: 89, name: 'Al-Fajr', ayahs: 30 },
  { id: 90, name: 'Al-Balad', ayahs: 20 },
  { id: 91, name: 'Ash-Shams', ayahs: 15 },
  { id: 92, name: 'Al-Layl', ayahs: 21 },
  { id: 93, name: 'Ad-Duha', ayahs: 11 },
  { id: 94, name: 'Ash-Sharh', ayahs: 8 },
  { id: 95, name: 'At-Tin', ayahs: 8 },
  { id: 96, name: 'Al-Alaq', ayahs: 19 },
  { id: 97, name: 'Al-Qadr', ayahs: 5 },
  { id: 98, name: 'Al-Bayyinah', ayahs: 8 },
  { id: 99, name: 'Az-Zalzalah', ayahs: 8 },
  { id: 100, name: 'Al-Adiyat', ayahs: 11 },
  { id: 101, name: 'Al-Qariah', ayahs: 11 },
  { id: 102, name: 'At-Takathur', ayahs: 8 },
  { id: 103, name: 'Al-Asr', ayahs: 3 },
  { id: 104, name: 'Al-Humazah', ayahs: 9 },
  { id: 105, name: 'Al-Fil', ayahs: 5 },
  { id: 106, name: 'Quraysh', ayahs: 4 },
  { id: 107, name: 'Al-Maun', ayahs: 7 },
  { id: 108, name: 'Al-Kawthar', ayahs: 3 },
  { id: 109, name: 'Al-Kafirun', ayahs: 6 },
  { id: 110, name: 'An-Nasr', ayahs: 3 },
  { id: 111, name: 'Al-Masad', ayahs: 5 },
  { id: 112, name: 'Al-Ikhlas', ayahs: 4 },
  { id: 113, name: 'Al-Falaq', ayahs: 5 },
  { id: 114, name: 'An-Nas', ayahs: 6 }
];

const sectionMeta: { key: SectionKey; title: string; icon: string }[] = [
  { key: 'sabaq', title: 'Sabaq', icon: '📘' },
  { key: 'sabqi', title: 'Sabqi', icon: '📗' },
  { key: 'manzil', title: 'Manzil', icon: '📙' }
];

const kaifiyatScores: Record<Exclude<KaifiyatValue, ''>, number> = {
  'Excellent ⭐⭐⭐⭐⭐': 5,
  'Good ⭐⭐⭐⭐': 4,
  'Average ⭐⭐⭐': 3,
  'Weak ⭐⭐': 2
};

function emptyRange(): SurahRangeForm {
  return {
    surahInput: '',
    surahId: null,
    fromAyah: '',
    toAyah: ''
  };
}

function emptySection(): SectionForm {
  return {
    ranges: [emptyRange()],
    kaifiyat: '',
    tajweeditotal: '',
    hifztotal: ''
  };
}

function formatDateYMD(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toISOString().slice(0, 10);
}

function getSurahById(id: number | null): Surah | undefined {
  if (!id) return undefined;
  return SURAH_LIST.find((item) => item.id === id);
}

function resolveSurah(input: string): Surah | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const idMatch = trimmed.match(/^(\d{1,3})\s*\.?\s*(.*)$/);
  if (idMatch) {
    const id = Number(idMatch[1]);
    const byId = SURAH_LIST.find((item) => item.id === id);
    if (byId) return byId;
  }

  const normalized = trimmed.toLowerCase();
  return SURAH_LIST.find((item) => item.name.toLowerCase() === normalized);
}

function createEmptyParsedSection(): ParsedSection {
  return {
    ranges: [],
    kaifiyat: '',
    tajweeditotal: 0,
    hifztotal: 0
  };
}

function parseStructuredNotes(notes: string | null): ParsedReport | null {
  if (!notes) return null;

  const parsed: ParsedReport = {
    sections: {
      sabaq: createEmptyParsedSection(),
      sabqi: createEmptyParsedSection(),
      manzil: createEmptyParsedSection()
    },
    overall: '-',
    totalMistakes: 0,
    suggestion: '-'
  };

  const lines = notes.split('\n').map((line) => line.trim()).filter(Boolean);
  let currentSection: SectionKey | null = null;

  for (const line of lines) {
    if (line === '[SABAQ]') currentSection = 'sabaq';
    if (line === '[SABQI]') currentSection = 'sabqi';
    if (line === '[MANZIL]') currentSection = 'manzil';

    if (line.startsWith('OverallPerformance:')) {
      parsed.overall = line.replace('OverallPerformance:', '').trim();
      continue;
    }
    if (line.startsWith('TotalMistakes')) {
      const count = Number.parseInt(line.replace('TotalMistakes', '').trim(), 10);
      parsed.totalMistakes = Number.isNaN(count) ? 0 : count;
      continue;
    }
    if (line.startsWith('Suggestion:')) {
      parsed.suggestion = line.replace('Suggestion:', '').trim();
      continue;
    }

    if (!currentSection) continue;

    // Parse new multi-range format
    if (line.startsWith('Range:')) {
      // Range:1, Range:2, etc - marks start of new range
      continue;
    } else if (line.startsWith('Kaifiyat:')) {
      parsed.sections[currentSection].kaifiyat = line.replace('Kaifiyat:', '').trim() as ParsedSection['kaifiyat'];
    } else if (line.startsWith('TajweeditTotal:')) {
      const value = Number.parseInt(line.replace('TajweeditTotal:', '').trim(), 10);
      parsed.sections[currentSection].tajweeditotal = Number.isNaN(value) ? 0 : value;
    } else if (line.startsWith('HifzTotal:')) {
      const value = Number.parseInt(line.replace('HifzTotal:', '').trim(), 10);
      parsed.sections[currentSection].hifztotal = Number.isNaN(value) ? 0 : value;
    }
    // Skip old single-surah format fields (SurahId, FromAyah, ToAyah, etc)
    // They will be loaded from SurahRange table instead
  }

  return parsed;
}

function computeStars(parsed: ParsedReport | null) {
  if (!parsed) return 0;
  const values = sectionMeta
    .map(({ key }) => parsed.sections[key].kaifiyat)
    .filter((value): value is Exclude<KaifiyatValue, ''> => Boolean(value));
  if (!values.length) return 0;
  const avg = values.reduce((sum, value) => sum + kaifiyatScores[value], 0) / values.length;
  return Math.round(avg);
}

function computeReportMistakes(parsed: ParsedReport | null) {
  if (!parsed) return 0;
  return parsed.totalMistakes || sectionMeta.reduce((sum, { key }) => {
    const section = parsed.sections[key];
    const taj = section.tajweeditotal || 0;
    const hifz = section.hifztotal || 0;
    return sum + taj + hifz;
  }, 0);
}

function getSectionLabelFromNotes(notes: string | null, sectionKey: string): string {
  if (!notes) return '-';
  const upper = sectionKey.toUpperCase();
  const block = notes.match(new RegExp(`\\[${upper}\\]([\\s\\S]*?)(?=\\[|$)`))?.[1] ?? null;
  if (!block) return '-';
  const ranges = block
    .split(/Range:\d+/)
    .slice(1)
    .map((rangeBlock) => {
      const surahName = rangeBlock.match(/SurahName:([^\n\r]+)/)?.[1]?.trim();
      const from = rangeBlock.match(/FromAyah:(\d+)/)?.[1];
      const to = rangeBlock.match(/ToAyah:(\d+)/)?.[1];
      if (!surahName || surahName === '-' || !from || !to) return null;
      return `${surahName} (${from}-${to})`;
    })
    .filter((value): value is string => Boolean(value));
  if (ranges.length > 0) return ranges.join(', ');
  const surahName = block.match(/SurahName:([^\n\r]+)/)?.[1]?.trim();
  const from = block.match(/FromAyah:(\d+)/)?.[1];
  const to = block.match(/ToAyah:(\d+)/)?.[1];
  if (surahName && from && to && surahName !== '-') return `${surahName} (${from}–${to})`;
  return '-';
}

function parseSectionFormFromNotes(notes: string | null, sectionKey: SectionKey): SectionForm {
  if (!notes) return emptySection();
  const upper = sectionKey.toUpperCase();
  const block = notes.match(new RegExp(`\\[${upper}\\]([\\s\\S]*?)(?=\\[|$)`))?.[1] ?? '';
  if (!block) return emptySection();

  const ranges: SurahRangeForm[] = [];
  const rangeBlocks = block.split(/Range:\d+/).slice(1);
  for (const rangeBlock of rangeBlocks) {
    const surahId = Number(rangeBlock.match(/SurahId:(\d+)/)?.[1] ?? 0);
    const surahName = rangeBlock.match(/SurahName:([^\n\r]+)/)?.[1]?.trim() ?? '';
    const fromAyah = rangeBlock.match(/FromAyah:(\d+)/)?.[1] ?? '';
    const toAyah = rangeBlock.match(/ToAyah:(\d+)/)?.[1] ?? '';
    if (!surahId && !fromAyah && !toAyah) continue;
    const surah = getSurahById(surahId);
    ranges.push({
      surahInput: surah ? `${surah.id}. ${surah.name}` : surahName,
      surahId: surahId || null,
      fromAyah,
      toAyah
    });
  }

  return {
    ranges: ranges.length ? ranges : [emptyRange()],
    kaifiyat: (block.match(/Kaifiyat:([^\n\r]+)/)?.[1]?.trim() ?? '') as KaifiyatValue,
    tajweeditotal: block.match(/TajweeditTotal:(\d+)/)?.[1] ?? '',
    hifztotal: block.match(/HifzTotal:(\d+)/)?.[1] ?? ''
  };
}

function emptyProgressForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    classId: '',
    studentId: '',
    sections: {
      sabaq: emptySection(),
      sabqi: emptySection(),
      manzil: emptySection()
    }
  };
}

export default function TeacherProgressPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [reportQuery, setReportQuery] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [saveAndMoveNext, setSaveAndMoveNext] = useState(false);

  const [form, setForm] = useState(emptyProgressForm);
  const [activeTab, setActiveTab] = useState<SectionKey>('sabaq');

  const addNotice = useCallback((type: NotificationItem['type'], text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 999);
    setNotifications((prev) => [{ id, type, text }, ...prev].slice(0, 4));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const selectedStudents = useMemo(
    () => students
      .filter((student) => student.class && student.class.id === form.classId)
      .filter((student) => {
        const query = studentSearch.toLowerCase();
        return !query || student.user.fullName.toLowerCase().includes(query) || student.admissionNo.toLowerCase().includes(query);
      }),
    [students, form.classId, studentSearch]
  );

  const filteredReports = useMemo(
    () => progress.filter((item) => {
      const dateMatch = !reportDate || formatDateYMD(item.date) === reportDate;
      const nameMatch = !reportQuery || item.student.user.fullName.toLowerCase().includes(reportQuery.toLowerCase());
      return dateMatch && nameMatch;
    }),
    [progress, reportDate, reportQuery]
  );

  const sectionBadges = useMemo(() => {
    const badges: Record<SectionKey, { rangeCount: number; mistakeCount: number }> = {
      sabaq: { rangeCount: 0, mistakeCount: 0 },
      sabqi: { rangeCount: 0, mistakeCount: 0 },
      manzil: { rangeCount: 0, mistakeCount: 0 }
    };

    sectionMeta.forEach(({ key }) => {
      const section = form.sections[key];
      const filledRanges = section.ranges.filter(r => r.surahId && r.fromAyah && r.toAyah).length;
      const taj = Number(section.tajweeditotal) || 0;
      const hifz = Number(section.hifztotal) || 0;
      badges[key] = {
        rangeCount: filledRanges,
        mistakeCount: taj + hifz
      };
    });

    return badges;
  }, [form.sections]);


  const summary = useMemo(() => {
    const ratings = sectionMeta
      .map(({ key }) => form.sections[key].kaifiyat)
      .filter((value): value is Exclude<KaifiyatValue, ''> => Boolean(value));

    const avg = ratings.length ? ratings.reduce((sum, item) => sum + kaifiyatScores[item], 0) / ratings.length : 0;

    const totalMistakes = sectionMeta.reduce((sum, { key }) => {
      const section = form.sections[key];
      const taj = Number(section.tajweeditotal) || 0;
      const hifz = Number(section.hifztotal) || 0;
      return sum + taj + hifz;
    }, 0);

    let overallPerformance = 'Pending';
    let suggestion = 'Complete all sections to get auto suggestion.';

    if (avg >= 4.5 && totalMistakes <= 2) {
      overallPerformance = 'Excellent';
      suggestion = 'Strong progress. Continue with same tajweed discipline.';
    } else if (avg >= 3.5 && totalMistakes <= 5) {
      overallPerformance = 'Good';
      suggestion = 'Good momentum. Focus 10 minutes on weak tajweed points.';
    } else if (avg >= 2.8) {
      overallPerformance = 'Average';
      suggestion = 'Needs improvement in Tajweed. Keep shorter ayaat with revision.';
    } else if (avg > 0) {
      overallPerformance = 'Weak';
      suggestion = 'Needs improvement in Tajweed and Hifz consistency.';
    }

    return {
      overallPerformance,
      totalMistakes,
      suggestion,
      avgStars: Math.round(avg)
    };
  }, [form.sections]);

  const suggestedNextSabaq = useMemo(() => {
    if (!progress.length) return null;
    const latest = progress[0];
    const parsed = parseStructuredNotes(latest.notes);
    if (!parsed) return null;

    const sabaq = parsed.sections.sabaq;
    if (!sabaq.ranges || sabaq.ranges.length === 0) return null;
    const lastRange = sabaq.ranges[sabaq.ranges.length - 1];
    if (!lastRange.surahId || !lastRange.toAyah) return null;

    const currentSurah = getSurahById(lastRange.surahId);
    if (!currentSurah) return null;

    if (lastRange.toAyah < currentSurah.ayahs) {
      const nextFrom = lastRange.toAyah + 1;
      const nextTo = Math.min(nextFrom + 4, currentSurah.ayahs);
      return { surahId: currentSurah.id, fromAyah: nextFrom, toAyah: nextTo, label: `${currentSurah.name} ${nextFrom}-${nextTo}` };
    }

    const nextSurah = getSurahById(currentSurah.id + 1);
    if (!nextSurah) return null;
    return { surahId: nextSurah.id, fromAyah: 1, toAyah: Math.min(5, nextSurah.ayahs), label: `${nextSurah.name} 1-${Math.min(5, nextSurah.ayahs)}` };
  }, [progress]);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, studentsRes] = await Promise.all([
        fetch('/api/classes', { cache: 'no-store' }),
        fetch('/api/students?view=teacher-progress', { cache: 'no-store' })
      ]);
      if (!classesRes.ok || !studentsRes.ok) {
        const classesError = await classesRes.json().catch(() => null);
        const studentsError = await studentsRes.json().catch(() => null);
        const errorMessage =
          (typeof classesError?.error === 'string' && classesError.error) ||
          (typeof studentsError?.error === 'string' && studentsError.error) ||
          'Failed to load progress data.';
        addNotice('error', errorMessage);
        if (classesRes.status === 403 || studentsRes.status === 403) setFeatureDisabled(true);
        return;
      }

      const classesJson = await classesRes.json();
      const studentsJson = await studentsRes.json();
      const classList = Array.isArray(classesJson) ? classesJson : [];
      const studentList = Array.isArray(studentsJson) ? studentsJson : [];
      setClasses(classList);
      setStudents(studentList);
      setFeatureDisabled(false);

      if (classList[0]?.id) {
        setForm((prev) => ({ ...prev, classId: prev.classId || classList[0].id }));
      }
    } catch {
      addNotice('error', 'Failed to load progress data.');
    } finally {
      setLoading(false);
    }
  }, [addNotice]);

  const loadProgressData = useCallback(async () => {
    if (!form.classId) {
      setProgress([]);
      return;
    }
    try {
      const query = new URLSearchParams({ classId: form.classId });
      if (form.studentId) query.set('studentId', form.studentId);
      query.set('_t', Date.now().toString());
      const response = await fetch(`/api/progress?${query.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errorMessage = typeof errorJson?.error === 'string' ? errorJson.error : 'Failed to load progress data.';
        addNotice('error', errorMessage);
        if (response.status === 403) setFeatureDisabled(true);
        setProgress([]);
        return;
      }

      const json = await response.json();
      setProgress(Array.isArray(json) ? json : []);
      setFeatureDisabled(false);
    } catch {
      addNotice('error', 'Failed to load progress data.');
    }
  }, [form.classId, form.studentId, addNotice]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadProgressData();
  }, [loadProgressData]);

  useEffect(() => {
    if (!form.studentId && selectedStudents[0]?.id) {
      setForm((prev) => ({ ...prev, studentId: selectedStudents[0].id }));
    }
  }, [selectedStudents, form.studentId]);

  const setSectionValue = (sectionKey: SectionKey, updates: Partial<SectionForm>) => {
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...prev.sections[sectionKey],
          ...updates
        }
      }
    }));
  };

  const handleSurahInput = (sectionKey: SectionKey, rangeIndex: number, value: string) => {
    const resolved = resolveSurah(value);
    const current = form.sections[sectionKey];
    const updatedRanges = [...current.ranges];

    if (!resolved) {
      updatedRanges[rangeIndex] = {
        ...updatedRanges[rangeIndex],
        surahInput: value,
        surahId: null,
        ...(value.trim() ? {} : { fromAyah: '', toAyah: '' })
      };
    } else {
      const from = updatedRanges[rangeIndex].fromAyah ? Math.min(Number(updatedRanges[rangeIndex].fromAyah), resolved.ayahs) : '';
      const to = updatedRanges[rangeIndex].toAyah ? Math.min(Number(updatedRanges[rangeIndex].toAyah), resolved.ayahs) : '';
      updatedRanges[rangeIndex] = {
        ...updatedRanges[rangeIndex],
        surahInput: value,
        surahId: resolved.id,
        fromAyah: from ? String(from) : '',
        toAyah: to ? String(to) : ''
      };
    }

    setForm(prev => ({ ...prev, sections: { ...prev.sections, [sectionKey]: { ...current, ranges: updatedRanges } } }));
  };

  const handleRemoveRange = (sectionKey: SectionKey, rangeIndex: number) => {
    const current = form.sections[sectionKey];
    const updatedRanges = current.ranges.filter((_, i) => i !== rangeIndex);
    if (updatedRanges.length === 0) {
      updatedRanges.push(emptyRange());
    }
    setForm(prev => ({ ...prev, sections: { ...prev.sections, [sectionKey]: { ...current, ranges: updatedRanges } } }));
  };

  const handleAddRange = (sectionKey: SectionKey) => {
    const current = form.sections[sectionKey];
    setForm(prev => ({ ...prev, sections: { ...prev.sections, [sectionKey]: { ...current, ranges: [...current.ranges, emptyRange()] } } }));
  };

  const applyAutoSuggestion = () => {
    if (!suggestedNextSabaq) return;
    const surah = getSurahById(suggestedNextSabaq.surahId);
    if (!surah) return;
    const sabaqRanges = [{
      id: undefined,
      surahInput: `${surah.id}. ${surah.name}`,
      surahId: surah.id,
      fromAyah: String(suggestedNextSabaq.fromAyah),
      toAyah: String(suggestedNextSabaq.toAyah)
    }];
    setForm(prev => ({ ...prev, sections: { ...prev.sections, sabaq: { ...prev.sections.sabaq, ranges: sabaqRanges } } }));
    addNotice('info', `Auto-filled next Sabaq: ${suggestedNextSabaq.label}`);
  };

  const applyQuickPerformanceToTab = (value: Exclude<KaifiyatValue, ''>) => {
    setSectionValue(activeTab, { kaifiyat: value });
    addNotice('info', `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}: ${value}`);
  };

  const applyQuickMistakesToTab = (value: '0' | '1-2' | '3+') => {
    const mistakeCount = value === '0' ? 0 : value === '1-2' ? 1 : 3;
    setSectionValue(activeTab, { tajweeditotal: String(mistakeCount), hifztotal: String(mistakeCount) });
  };

  const validateForm = () => {
    if (!form.date || !form.classId || !form.studentId) return 'Date, class, and student are required.';

    for (const { key, title } of sectionMeta) {
      const section = form.sections[key];
      const hasAnyRangeData = (section.ranges || []).some(
        (range) => range.surahId || range.fromAyah || range.toAyah || range.surahInput.trim()
      );
      const hasAnyMetaData = Boolean(section.kaifiyat || section.tajweeditotal || section.hifztotal);
      const hasAnyData = hasAnyRangeData || hasAnyMetaData;
      const isOptionalSection = key === 'sabqi' || key === 'manzil';

      // Sabqi/Manzil remain optional unless teacher has entered any data in that section.
      if (isOptionalSection && !hasAnyData) {
        continue;
      }

      // Must have at least 1 range
      if (!section.ranges || section.ranges.length === 0) {
        return `${title}: add at least one Surah range.`;
      }

      // Validate each range
      for (let i = 0; i < section.ranges.length; i++) {
        const range = section.ranges[i];
        if (!range.surahId || !range.fromAyah || !range.toAyah) {
          return `${title} Range ${i + 1}: complete all fields.`;
        }
        if (Number(range.fromAyah) > Number(range.toAyah)) {
          return `${title} Range ${i + 1}: From Ayah cannot be greater than To Ayah.`;
        }
      }

      // Must have Kaifiyat and mistake counts
      if (!section.kaifiyat) {
        return `${title}: select Kaifiyat (performance).`;
      }
      if (section.tajweeditotal === '' || Number(section.tajweeditotal) < 0 || Number(section.tajweeditotal) > 99) {
        return `${title}: Tajweedi mistakes must be 0-99.`;
      }
      if (section.hifztotal === '' || Number(section.hifztotal) < 0 || Number(section.hifztotal) > 99) {
        return `${title}: Hifz mistakes must be 0-99.`;
      }
    }
    return null;
  };

  const buildStructuredNotes = () => {
    const lines: string[] = ['Daily Progress Report'];

    sectionMeta.forEach(({ key, title }) => {
      const section = form.sections[key];
      lines.push(`[${title.toUpperCase()}]`);

      section.ranges.forEach((range, idx) => {
        const surah = getSurahById(range.surahId);
        lines.push(`Range:${idx + 1}`);
        lines.push(`SurahId:${surah?.id ?? ''}`);
        lines.push(`SurahName:${surah?.name ?? '-'}`);
        lines.push(`FromAyah:${range.fromAyah}`);
        lines.push(`ToAyah:${range.toAyah}`);
      });

      lines.push(`Kaifiyat:${section.kaifiyat}`);
      lines.push(`TajweeditTotal:${section.tajweeditotal}`);
      lines.push(`HifzTotal:${section.hifztotal}`);
    });

    lines.push('[SUMMARY]');
    lines.push(`OverallPerformance:${summary.overallPerformance}`);
    lines.push(`TotalMistakes${summary.totalMistakes}`);
    lines.push(`Suggestion:${summary.suggestion}`);
    return lines.join('\n');
  };

  const startEditReport = (item: ProgressItem) => {
    setEditingReportId(item.id);
    setOpenReportId(null);
    setForm({
      date: formatDateYMD(item.date),
      classId: item.classId || item.class.id,
      studentId: item.studentId || item.student.id,
      sections: {
        sabaq: parseSectionFormFromNotes(item.notes, 'sabaq'),
        sabqi: parseSectionFormFromNotes(item.notes, 'sabqi'),
        manzil: parseSectionFormFromNotes(item.notes, 'manzil')
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addNotice('info', `Editing report for ${item.student.user.fullName}`);
  };

  const cancelEditReport = () => {
    setEditingReportId(null);
    setForm((prev) => ({
      ...emptyProgressForm(),
      classId: prev.classId,
      studentId: prev.studentId
    }));
    addNotice('info', 'Edit cancelled.');
  };

  const deleteReport = async (item: ProgressItem) => {
    const ok = window.confirm(`Delete saved report for ${item.student.user.fullName} on ${formatDateYMD(item.date)}?`);
    if (!ok) return;

    setDeletingReportId(item.id);
    try {
      const response = await fetch(`/api/progress?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        addNotice('error', json?.error ?? 'Unable to delete report.');
        return;
      }
      if (editingReportId === item.id) setEditingReportId(null);
      setProgress((prev) => prev.filter((report) => report.id !== item.id));
      addNotice('success', 'Report deleted successfully.');
      await loadProgressData();
    } catch {
      addNotice('error', 'Delete request failed. Please try again.');
    } finally {
      setDeletingReportId(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (featureDisabled) return;

    const validationError = validateForm();
    if (validationError) {
      addNotice('error', validationError);
      return;
    }

    setSaving(true);
    try {
      // Build surah ranges for each section
      const surahRangesData: Record<string, Array<{ surahId: number; fromAyah: number; toAyah: number }>> = {};

      sectionMeta.forEach(({ key }) => {
        surahRangesData[key] = form.sections[key].ranges
          .filter((r) => r.surahId && r.fromAyah && r.toAyah)
          .map((r) => ({
            surahId: Number(r.surahId),
            fromAyah: Number(r.fromAyah),
            toAyah: Number(r.toAyah)
          }));
      });

      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          classId: form.classId,
          studentId: form.studentId,
          lessonType: 'SURAH',
          lessonNumber: Number(form.sections.sabaq.ranges[0]?.fromAyah || 1),
          ayahFrom: Number(form.sections.sabaq.ranges[0]?.fromAyah || 1),
          ayahTo: Number(form.sections.sabaq.ranges[form.sections.sabaq.ranges.length - 1]?.toAyah || 1),
          tajweeditotal: Number(form.sections.sabaq.tajweeditotal),
          hifzTotal: Number(form.sections.sabaq.hifztotal),
          surahRanges: surahRangesData,
          notes: buildStructuredNotes()
        })
      });

      const json = await response.json();
      if (!response.ok) {
        addNotice('error', typeof json?.error === 'string' ? json.error : 'Unable to save report.');
        if (response.status === 403) setFeatureDisabled(true);
        return;
      }

      addNotice('success', editingReportId ? 'Quran progress report updated successfully.' : 'Quran progress report saved successfully.');
      setEditingReportId(null);

      if (saveAndMoveNext) {
        setSaveAndMoveNext(false);
        const nextStudent = selectedStudents.find((s) => s.id > form.studentId);
        if (nextStudent) {
          setForm((prev) => ({
            ...prev,
            studentId: nextStudent.id,
            sections: {
              sabaq: emptySection(),
              sabqi: emptySection(),
              manzil: emptySection()
            }
          }));
          addNotice('info', `Moved to ${nextStudent.user.fullName}`);
        } else {
          setForm((prev) => ({
            ...prev,
            sections: {
              sabaq: emptySection(),
              sabqi: emptySection(),
              manzil: emptySection()
            }
          }));
          addNotice('info', 'No more students in this class.');
        }
      } else {
        setForm((prev) => ({
          ...prev,
          sections: {
            sabaq: emptySection(),
            sabqi: emptySection(),
            manzil: emptySection()
          }
        }));
      }

      await loadProgressData();
    } catch {
      addNotice('error', 'Request failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find((item) => item.id === form.classId);
  const selectedStudent = selectedStudents.find((item) => item.id === form.studentId);

  return (
    <div className="-mx-4 -my-6 min-h-screen space-y-4 bg-[#F7F9FB] px-4 py-5 pb-44 text-[#111827] sm:-mx-6 sm:px-6 sm:pb-28 lg:-mx-8 lg:px-8">
      <div className="overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF7F6_52%,#EEF2FF_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#006A61]">Manarah Institute</p>
            <h1 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.04em] text-[#0F172A]">Daily Progress Report</h1>
            <p className="mt-1 text-sm font-medium text-[#64748B]">Track Quran progress with focused daily feedback.</p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#004D47] text-white shadow-[0_14px_28px_rgba(0,77,71,0.24)]">
            <BookOpenCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Class</p>
            <p className="mt-1 truncate text-sm font-extrabold text-[#004D47]">{selectedClass ? `${selectedClass.name} ${selectedClass.section}` : 'Select'}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Student</p>
            <p className="mt-1 truncate text-sm font-extrabold text-[#2E2B78]">{selectedStudent?.user.fullName ?? 'Pending'}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">Mistakes</p>
            <p className="mt-1 text-sm font-extrabold text-[#B45309]">{summary.totalMistakes}</p>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {notifications.map((notice) => (
              <div
                key={notice.id}
                className={`rounded-2xl px-4 py-3 text-sm font-bold shadow-sm ${
                  notice.type === 'success'
                    ? 'bg-[#DDF8EA] text-[#065F46]'
                    : notice.type === 'error'
                      ? 'bg-[#FEE2E2] text-[#991B1B]'
                      : 'bg-[#E0F2FE] text-[#075985]'
                }`}
              >
                {notice.text}
              </div>
            ))}
          </div>
        )}
      </div>


      <section className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <form onSubmit={submit}>
            <div className="space-y-4 rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#E6F3F1] text-[#004D47]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-[-0.02em] text-[#0F172A]">Report Filters</h2>
                  <p className="text-xs font-medium text-[#64748B]">Choose class, date, and student before saving.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:bg-white focus:ring-4 focus:ring-[#006A61]/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Class</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value, studentId: '' }))}
                    className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:bg-white focus:ring-4 focus:ring-[#006A61]/10"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Search</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Student name"
                      className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm font-semibold text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#006A61] focus:bg-white focus:ring-4 focus:ring-[#006A61]/10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Student</label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:bg-white focus:ring-4 focus:ring-[#006A61]/10"
                  required
                >
                  <option value="">Select Student</option>
                  {selectedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.fullName} ({student.admissionNo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {sectionMeta.map((section) => {
                const badge = sectionBadges[section.key];
                const isActive = activeTab === section.key;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveTab(section.key)}
                    className={`min-w-0 rounded-2xl px-2 py-2.5 text-[11px] font-black shadow-sm transition-all active:scale-[0.98] sm:text-sm ${
                      isActive
                        ? 'bg-[#084750] text-white shadow-[0_12px_28px_rgba(8,71,80,0.22)]'
                        : 'border border-white bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="block truncate">{section.icon} {section.title}</span>
                    <span className="mt-1 inline-flex rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold opacity-90">
                      {badge.rangeCount} · {badge.mistakeCount}✗
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {sectionMeta.map((section) => {
                if (activeTab !== section.key) return null;
                const formSection = form.sections[section.key];

                return (
                  <div key={section.key} className="space-y-4 rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#006A61]">Active Section</p>
                        <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#0F172A]">{section.icon} {section.title}</h3>
                      </div>
                      <div className="flex w-full items-center justify-between rounded-2xl bg-[#F8FAFC] px-3 py-2 sm:block sm:w-auto sm:min-w-[118px] sm:text-right">
                        <p className="text-[10px] font-bold uppercase text-[#94A3B8]">Score</p>
                        <p className="max-w-[150px] truncate text-sm font-black text-[#00507D] sm:max-w-none">{summary.overallPerformance}</p>
                      </div>
                    </div>

                    {/* Quick Actions (tab-scoped) */}
                    <div className="rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Quick Actions</p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="self-center text-[10px] font-bold uppercase text-[#94A3B8]">Rating</span>
                          <button type="button" onClick={() => applyQuickPerformanceToTab('Excellent ⭐⭐⭐⭐⭐')} className="rounded-xl bg-[#006A61] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#004D47]">Ex</button>
                          <button type="button" onClick={() => applyQuickPerformanceToTab('Good ⭐⭐⭐⭐')} className="rounded-xl bg-[#006A61] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#004D47]">Good</button>
                          <button type="button" onClick={() => applyQuickPerformanceToTab('Average ⭐⭐⭐')} className="rounded-xl bg-[#006A61] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#004D47]">Avg</button>
                          <button type="button" onClick={() => applyQuickPerformanceToTab('Weak ⭐⭐')} className="rounded-xl bg-[#006A61] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#004D47]">Weak</button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="self-center text-[10px] font-bold uppercase text-[#94A3B8]">Mistakes</span>
                          <button type="button" onClick={() => applyQuickMistakesToTab('0')} className="rounded-xl border border-[#FCD34D]/60 bg-[#FFFBEB] px-3 py-1.5 text-xs font-bold text-[#B45309] transition hover:bg-[#FEF3C7]">0</button>
                          <button type="button" onClick={() => applyQuickMistakesToTab('1-2')} className="rounded-xl border border-[#FCD34D]/60 bg-[#FFFBEB] px-3 py-1.5 text-xs font-bold text-[#B45309] transition hover:bg-[#FEF3C7]">1–2</button>
                          <button type="button" onClick={() => applyQuickMistakesToTab('3+')} className="rounded-xl border border-[#FCD34D]/60 bg-[#FFFBEB] px-3 py-1.5 text-xs font-bold text-[#B45309] transition hover:bg-[#FEF3C7]">3+</button>
                        </div>
                      </div>
                    </div>

                    {/* Auto Suggest (Sabaq only) */}
                    {section.key === 'sabaq' && suggestedNextSabaq ? (
                      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#BFE7DF] bg-[#ECFDF5] p-3 text-sm text-[#006A61]">
                        <Sparkles className="h-4 w-4" />
                        <span className="font-semibold">Auto Suggest:</span>
                        <span>{suggestedNextSabaq.label}</span>
                        <button type="button" onClick={applyAutoSuggestion} className="rounded-xl bg-[#006A61] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#004D47]">
                          Apply
                        </button>
                      </div>
                    ) : null}

                    <div className="mb-4 space-y-3">
                      {formSection.ranges.map((range, rangeIdx) => {
                        const selectedSurah = getSurahById(range.surahId || 0);
                        const ayahCount = selectedSurah?.ayahs ?? 0;

                        return (
                          <div key={rangeIdx} className="space-y-3 rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-black text-[#0F172A]">Surah Range {rangeIdx + 1}</p>
                              <button
                                type="button"
                                onClick={() => handleRemoveRange(section.key, rangeIdx)}
                                className="rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-bold text-[#B91C1C] transition hover:bg-[#FECACA]"
                              >
                                {formSection.ranges.length > 1 ? 'Remove' : 'Clear'}
                              </button>
                            </div>

                            <div className="grid gap-2 md:grid-cols-3">
                              <div>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Surah</p>
                                <select
                                  value={selectedSurah ? `${selectedSurah.id}. ${selectedSurah.name}` : ''}
                                  onChange={(e) => handleSurahInput(section.key, rangeIdx, e.target.value)}
                                  className="h-11 w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:ring-4 focus:ring-[#006A61]/10 disabled:bg-[#EEF2F7] disabled:text-[#94A3B8]"
                                  required
                                >
                                  <option value="">Select Surah</option>
                                  {SURAH_LIST.map((surah) => (
                                    <option key={surah.id} value={`${surah.id}. ${surah.name}`}>{surah.id}. {surah.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">From</p>
                                <input
                                  type="number"
                                  min={1}
                                  max={ayahCount || 1}
                                  value={range.fromAyah}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const updatedRanges = [...formSection.ranges];
                                    if (value === '') {
                                      updatedRanges[rangeIdx] = { ...updatedRanges[rangeIdx], fromAyah: '' };
                                    } else {
                                      const numeric = Number(value);
                                      const safeValue = selectedSurah && Number.isFinite(numeric)
                                        ? String(Math.max(1, Math.min(numeric, selectedSurah.ayahs)))
                                        : value;
                                      updatedRanges[rangeIdx] = { ...updatedRanges[rangeIdx], fromAyah: safeValue };
                                    }
                                    setForm(prev => ({ ...prev, sections: { ...prev.sections, [section.key]: { ...formSection, ranges: updatedRanges } } }));
                                  }}
                                  className="h-11 w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:ring-4 focus:ring-[#006A61]/10 disabled:bg-[#EEF2F7] disabled:text-[#94A3B8]"
                                  disabled={!selectedSurah}
                                  placeholder="From"
                                />
                              </div>

                              <div>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">To</p>
                                <input
                                  type="number"
                                  min={range.fromAyah ? Number(range.fromAyah) : 1}
                                  max={ayahCount || 1}
                                  value={range.toAyah}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const updatedRanges = [...formSection.ranges];
                                    if (value === '') {
                                      updatedRanges[rangeIdx] = { ...updatedRanges[rangeIdx], toAyah: '' };
                                    } else {
                                      const numeric = Number(value);
                                      const minAllowed = Number(range.fromAyah || 1);
                                      const maxAllowed = selectedSurah ? selectedSurah.ayahs : 1;
                                      const safeValue = Number.isFinite(numeric)
                                        ? String(Math.max(minAllowed, Math.min(numeric, maxAllowed)))
                                        : value;
                                      updatedRanges[rangeIdx] = { ...updatedRanges[rangeIdx], toAyah: safeValue };
                                    }
                                    setForm(prev => ({ ...prev, sections: { ...prev.sections, [section.key]: { ...formSection, ranges: updatedRanges } } }));
                                  }}
                                  className="h-11 w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:ring-4 focus:ring-[#006A61]/10 disabled:bg-[#EEF2F7] disabled:text-[#94A3B8]"
                                  disabled={!selectedSurah}
                                  placeholder="To"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                    <button
                      type="button"
                      onClick={() => handleAddRange(section.key)}
                      className="mb-4 inline-flex h-10 items-center rounded-2xl bg-[#E6F3F1] px-4 text-xs font-black text-[#004D47] transition hover:bg-[#D7EDEA]"
                    >
                      + Add Another Surah Range
                    </button>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Kaifiyat (Performance)</p>
                        <select
                          value={formSection.kaifiyat}
                          onChange={(e) => setSectionValue(section.key, { kaifiyat: e.target.value as KaifiyatValue })}
                          className="h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:bg-white focus:ring-4 focus:ring-[#006A61]/10"
                          required
                        >
                        <option value="">Select Rating</option>
                        <option value="Excellent ⭐⭐⭐⭐⭐">Excellent ⭐⭐⭐⭐⭐</option>
                        <option value="Good ⭐⭐⭐⭐">Good ⭐⭐⭐⭐</option>
                        <option value="Average ⭐⭐⭐">Average ⭐⭐⭐</option>
                        <option value="Weak ⭐⭐">Weak ⭐⭐</option>
                      </select>
                    </div>

                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Tajweedi Ghaltiyan (0-99)</p>
                        <div className="flex flex-col gap-2">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={formSection.tajweeditotal}
                            onChange={(e) => setSectionValue(section.key, { tajweeditotal: e.target.value })}
                            placeholder="0"
                            className="h-12 w-full rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#D9A253] focus:ring-4 focus:ring-[#D9A253]/15"
                            required
                          />
                          <div className="flex flex-wrap gap-1">
                            {[0, 1, 2, 3, 5, 10].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setSectionValue(section.key, { tajweeditotal: String(val) })}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${formSection.tajweeditotal === String(val) ? 'border-[#D9A253] bg-[#FEF3C7] text-[#92400E]' : 'border-[#FDE68A] bg-white text-[#B45309] hover:bg-[#FFFBEB]'}`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Hifz Ghaltiyan (0-99)</p>
                        <div className="flex flex-col gap-2">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={formSection.hifztotal}
                            onChange={(e) => setSectionValue(section.key, { hifztotal: e.target.value })}
                            placeholder="0"
                            className="h-12 w-full rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#D9A253] focus:ring-4 focus:ring-[#D9A253]/15"
                            required
                          />
                          <div className="flex flex-wrap gap-1">
                            {[0, 1, 2, 3, 5, 10].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setSectionValue(section.key, { hifztotal: String(val) })}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${formSection.hifztotal === String(val) ? 'border-[#D9A253] bg-[#FEF3C7] text-[#92400E]' : 'border-[#FDE68A] bg-white text-[#B45309] hover:bg-[#FFFBEB]'}`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </form>
        </div>

        <aside className="hidden space-y-4 md:block">
          <div className="space-y-4 rounded-[24px] border border-white bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF7F6_100%)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#E6F3F1] p-2">
                <Sparkles className="h-5 w-5 text-[#004D47]" />
              </div>
              <h3 className="font-bold text-[#1F2937]">Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Overall</p>
                <p className="font-black text-[#004D47]">{summary.overallPerformance}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Mistakes</p>
                <p className="font-black text-[#B45309]">{summary.totalMistakes}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Suggestion</p>
                <p className="text-sm text-[#1F2937]">{summary.suggestion}</p>
              </div>
              <div className="flex items-center justify-center gap-1 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < summary.avgStars ? 'fill-[#df8d29] text-[#df8d29]' : 'text-[#E5E7EB]'}`} />
                ))}
              </div>
            </div>
          </div>


          <div className="rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-[#004649]" />
              <h3 className="font-bold text-[#1F2937]">Teacher Guidance</h3>
            </div>
            <ul className="space-y-1 text-sm text-[#6B7280]">
              <li>- Keep sabaq range realistic for quality.</li>
              <li>- If mistakes increase, reduce range and revise.</li>
              <li>- Use auto-suggest to continue lesson sequence.</li>
            </ul>
          </div>
        </aside>
      </section>

      {/* Mobile Auto Summary (collapsible) */}
      <div className="mb-4 md:hidden">
        <details className="rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
          <summary className="flex cursor-pointer items-center gap-3 font-black text-[#0F172A]">
            <Sparkles className="h-5 w-5 text-[#004D47]" />
            <span>Performance Summary</span>
            <span className="ml-auto text-xs text-[#6B7280]">▼</span>
          </summary>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Overall Performance</span>
              <span className="font-black text-[#004D47]">{summary.overallPerformance}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-[#E5E7EB]">
              <span className="text-[#6B7280]">Total Mistakes</span>
              <span className="font-black text-[#B45309]">{summary.totalMistakes}</span>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">Suggestion</p>
              <p className="text-sm text-[#1F2937] font-medium">{summary.suggestion}</p>
            </div>
            <div className="flex items-center justify-center gap-1 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < summary.avgStars ? 'fill-[#df8d29] text-[#df8d29]' : 'text-[#E5E7EB]'}`} />
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Mobile-safe actions */}
      <div className="rounded-[24px] border border-white/70 bg-white/95 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        {editingReportId ? (
          <div className="mb-3 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm font-bold text-[#92400E]">
            Editing saved report. Update it or cancel editing.
          </div>
        ) : null}
        <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
          {editingReportId ? (
            <button
              type="button"
              onClick={cancelEditReport}
              disabled={saving}
              className="h-12 w-full rounded-2xl border border-[#D8E2E7] bg-white px-6 text-sm font-black text-[#64748B] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancel Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              setSaveAndMoveNext(false);
              await submit({ preventDefault: () => {} } as React.FormEvent);
            }}
            disabled={saving || loading || featureDisabled}
            className="h-12 w-full rounded-2xl bg-[#084750] px-6 text-sm font-black text-white shadow-[0_16px_32px_rgba(8,71,80,0.26)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Saving...' : editingReportId ? 'Update Report' : 'Save Report'}
          </button>
          <button
            type="button"
            onClick={async () => {
              setSaveAndMoveNext(true);
              await submit({ preventDefault: () => {} } as React.FormEvent);
            }}
            disabled={saving || loading || featureDisabled || Boolean(editingReportId) || !selectedStudents.some((s) => s.id > form.studentId)}
            className="h-12 w-full rounded-2xl border border-[#D8E2E7] bg-white px-6 text-sm font-black text-[#004D47] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save & Next →'}
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-white bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-xl font-black tracking-[-0.03em] text-[#0F172A]">Saved Reports</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="h-11 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#006A61] focus:bg-white focus:ring-4 focus:ring-[#006A61]/10"
            />
            <input
              value={reportQuery}
              onChange={(e) => setReportQuery(e.target.value)}
              placeholder="Search student"
              className="h-11 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#006A61] focus:bg-white focus:ring-4 focus:ring-[#006A61]/10"
            />
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No reports found for selected filters.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((item) => {
              const parsed = parseStructuredNotes(item.notes);
              const stars = computeStars(parsed);
              const mistakes = computeReportMistakes(parsed);
              const surahLabel = getSectionLabelFromNotes(item.notes, 'sabaq');

              return (
                <div key={item.id} className="rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">{formatDateYMD(item.date)}</p>
                  <p className="mt-1 text-base font-bold text-[#1F2937]">{item.student.user.fullName}</p>
                  <p className="text-xs text-[#9CA3AF]">{item.class.name} - {item.class.section}</p>
                  <p className="mt-2 text-sm text-[#004649]"><span className="font-semibold">Sabaq:</span> {surahLabel}</p>

                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < stars ? 'fill-[#df8d29] text-[#df8d29]' : 'text-[#E5E7EB]'}`} />
                    ))}
                  </div>

                  <div className="mt-3 inline-flex rounded-full bg-[#FFFBEB] px-3 py-1 text-xs font-black text-[#B45309]">
                    Mistakes: {mistakes}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenReportId((prev) => (prev === item.id ? null : item.id))}
                      className="inline-flex items-center rounded-2xl bg-[#084750] px-4 py-2 text-xs font-black text-white shadow-[0_10px_20px_rgba(8,71,80,0.18)] transition-all active:scale-[0.98]"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditReport(item)}
                      className="inline-flex items-center rounded-2xl border border-[#B8DAD5] bg-white px-4 py-2 text-xs font-black text-[#084750] transition-all active:scale-[0.98]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteReport(item)}
                      disabled={deletingReportId === item.id}
                      className="inline-flex items-center rounded-2xl border border-[#FCA5A5] bg-white px-4 py-2 text-xs font-black text-[#B91C1C] transition-all active:scale-[0.98] disabled:opacity-60"
                    >
                      {deletingReportId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>

                  {openReportId === item.id ? (
                    <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-white p-3 space-y-2 text-xs">
                      {parsed ? (
                        <>
                          {sectionMeta.map(({ key, title, icon }) => {
                            const sec = parsed.sections[key];
                            const rangeLabel = getSectionLabelFromNotes(item.notes, key);
                            return (
                              <div key={key}>
                                <p className="font-semibold text-[#374151]">{icon} {title}</p>
                                <p className="text-[#6B7280]">{rangeLabel} · {sec.kaifiyat || '-'} · T:{sec.tajweeditotal} H:{sec.hifztotal}</p>
                              </div>
                            );
                          })}
                          <div className="pt-1 border-t border-[#E5E7EB] flex justify-between">
                            <span className="text-[#6B7280]">Overall: <span className="font-semibold text-[#004649]">{parsed.overall}</span></span>
                            <span className="text-[#6B7280]">Mistakes <span className="font-semibold text-[#be123c]">{parsed.totalMistakes}</span></span>
                          </div>
                        </>
                      ) : (
                        <p className="text-[#9CA3AF]">No structured data available.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

