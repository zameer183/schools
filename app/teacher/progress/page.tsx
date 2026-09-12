'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  ChevronDown,
  X,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  BookOpen,
  GraduationCap,
  Users,
  Award,
  AlertTriangle,
  Flame,
  Check,
  RotateCcw
} from 'lucide-react';

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

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateYMD(value: Date | string) {
  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matched) return `${matched[1]}-${matched[2]}-${matched[3]}`;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`;
}

function todayDateYMD() {
  const today = new Date();
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`;
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
    date: todayDateYMD(),
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
    <div className="w-full space-y-6 pb-32 text-slate-800">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 p-6 text-white shadow-xl shadow-teal-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-400/15 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-sm">
              <BookOpenCheck className="h-3.5 w-3.5" />
              <span>Daily Quran Assessment</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Daily Progress Report
            </h1>
            <p className="text-sm font-medium text-teal-100/80">
              Track Sabaq, Sabqi, and Manzil assessments with instant feedback.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur-md shadow-inner text-teal-200">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Live Stat Badges Bar */}
        <div className="relative mt-6 grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-200/80">Active Class</p>
            <p className="mt-1 truncate text-xs font-black text-white sm:text-sm">
              {selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : 'Select Class'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-200/80">Active Student</p>
            <p className="mt-1 truncate text-xs font-black text-white sm:text-sm">
              {selectedStudent ? selectedStudent.user.fullName : 'Select Student'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-200/80">Total Mistakes</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black ${
                summary.totalMistakes === 0 
                  ? 'bg-emerald-400/20 text-emerald-300' 
                  : summary.totalMistakes <= 3 
                    ? 'bg-amber-400/20 text-amber-300' 
                    : 'bg-rose-400/20 text-rose-300'
              }`}>
                {summary.totalMistakes}
              </span>
              <span className="hidden text-[11px] font-semibold text-teal-100/70 sm:inline">
                ({summary.overallPerformance})
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
            {notifications.map((notice) => (
              <div
                key={notice.id}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-lg backdrop-blur-md ${
                  notice.type === 'success'
                    ? 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-100'
                    : notice.type === 'error'
                      ? 'border border-rose-400/30 bg-rose-500/20 text-rose-100'
                      : 'border border-teal-400/30 bg-teal-500/20 text-teal-100'
                }`}
              >
                {notice.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />}
                {notice.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" />}
                {notice.type === 'info' && <Sparkles className="h-4 w-4 shrink-0 text-teal-300" />}
                <span className="truncate">{notice.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Form & Performance Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Assessment Column */}
        <div className="space-y-6 xl:col-span-8">
          <form onSubmit={submit} className="space-y-6">
            {/* Card 1: Session & Student Selector */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Session & Student Selection</h2>
                    <p className="text-xs font-medium text-slate-500">Choose date, target class, and student</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assessment Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Class & Section
                  </label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value, studentId: '' }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
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
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Search Student
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Filter by name..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3.5">
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Student Target ({selectedStudents.length} available)</span>
                  {selectedStudent && (
                    <span className="text-[11px] font-semibold text-teal-700">
                      Admission #{selectedStudent.admissionNo || 'N/A'}
                    </span>
                  )}
                </label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  required
                >
                  <option value="">Select Student</option>
                  {selectedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.fullName} {student.admissionNo ? `(${student.admissionNo})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assessment Tabs Segmented Control */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-200/70 p-1.5">
              {sectionMeta.map((section) => {
                const badge = sectionBadges[section.key];
                const isActive = activeTab === section.key;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveTab(section.key)}
                    className={`group relative flex flex-col items-center justify-center rounded-xl py-2.5 transition-all active:scale-[0.98] sm:py-3 ${
                      isActive
                        ? 'bg-white text-teal-900 shadow-md shadow-slate-950/5 ring-1 ring-black/5'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{section.icon}</span>
                      <span className="text-xs font-black sm:text-sm">{section.title}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-300/60 text-slate-700'
                      }`}>
                        {badge.rangeCount} R
                      </span>
                      {badge.mistakeCount > 0 ? (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                          {badge.mistakeCount} ✗
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          0 ✗
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Content Card */}
            {sectionMeta.map((section) => {
              if (activeTab !== section.key) return null;
              const formSection = form.sections[section.key];

              return (
                <div key={section.key} className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  {/* Section Title Bar */}
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{section.icon}</span>
                        <h3 className="text-lg font-black text-slate-900">{section.title} Assessment</h3>
                        {section.key !== 'sabaq' && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {section.key === 'sabaq' && 'New daily lesson tracking and recitation quality.'}
                        {section.key === 'sabqi' && 'Recent Surahs revision assessment.'}
                        {section.key === 'manzil' && 'Long-term Quran revision and consolidation.'}
                      </p>
                    </div>

                    {formSection.kaifiyat && (
                      <div className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-800">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        <span>{formSection.kaifiyat}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Rating & Mistakes Shortcuts Bar */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Quick Grade & Mistakes Presets
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Rating Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-[11px] font-bold text-slate-400">Rating:</span>
                        {(
                          [
                            { label: 'Ex', val: 'Excellent ⭐⭐⭐⭐⭐' },
                            { label: 'Good', val: 'Good ⭐⭐⭐⭐' },
                            { label: 'Avg', val: 'Average ⭐⭐⭐' },
                            { label: 'Weak', val: 'Weak ⭐⭐' }
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => applyQuickPerformanceToTab(item.val)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                              formSection.kaifiyat === item.val
                                ? 'bg-teal-700 text-white shadow-sm'
                                : 'bg-white text-slate-700 hover:bg-teal-50 hover:text-teal-900 border border-slate-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {/* Mistakes Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-[11px] font-bold text-slate-400">Mistakes:</span>
                        {(['0', '1-2', '3+'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => applyQuickMistakesToTab(m)}
                            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-amber-50 hover:text-amber-900 active:scale-95"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Auto Suggestion Banner (Sabaq Only) */}
                  {section.key === 'sabaq' && suggestedNextSabaq && (
                    <div className="flex flex-col gap-2.5 rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                        <Sparkles className="h-4 w-4 shrink-0 text-teal-600" />
                        <span>Suggested Next Lesson:</span>
                        <span className="rounded-lg bg-teal-100 px-2 py-0.5 font-extrabold text-teal-800">
                          {suggestedNextSabaq.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={applyAutoSuggestion}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-teal-800 active:scale-95 sm:w-auto"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Apply Suggestion</span>
                      </button>
                    </div>
                  )}

                  {/* Surah Ranges List */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Surah Ranges ({formSection.ranges.length})
                    </p>

                    {formSection.ranges.map((range, rangeIdx) => {
                      const selectedSurah = getSurahById(range.surahId || 0);
                      const ayahCount = selectedSurah?.ayahs ?? 0;

                      return (
                        <div
                          key={rangeIdx}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition focus-within:border-teal-400 focus-within:bg-white"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-100 text-xs font-black text-teal-800">
                                {rangeIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-700">Range #{rangeIdx + 1}</span>
                              {selectedSurah && (
                                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                  {ayahCount} Total Ayahs
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveRange(section.key, rangeIdx)}
                              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{formSection.ranges.length > 1 ? 'Remove' : 'Clear'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                            {/* Surah selector */}
                            <div className="sm:col-span-6">
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Surah
                              </label>
                              <select
                                value={selectedSurah ? `${selectedSurah.id}. ${selectedSurah.name}` : ''}
                                onChange={(e) => handleSurahInput(section.key, rangeIdx, e.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10"
                                required={section.key === 'sabaq'}
                              >
                                <option value="">Select Surah</option>
                                {SURAH_LIST.map((surah) => (
                                  <option key={surah.id} value={`${surah.id}. ${surah.name}`}>
                                    {surah.id}. {surah.name} ({surah.ayahs} Ayahs)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* From Ayah */}
                            <div className="sm:col-span-3">
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                From Ayah
                              </label>
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
                                    const safeValue =
                                      selectedSurah && Number.isFinite(numeric)
                                        ? String(Math.max(1, Math.min(numeric, selectedSurah.ayahs)))
                                        : value;
                                    updatedRanges[rangeIdx] = { ...updatedRanges[rangeIdx], fromAyah: safeValue };
                                  }
                                  setForm((prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      [section.key]: { ...formSection, ranges: updatedRanges }
                                    }
                                  }));
                                }}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 disabled:bg-slate-100 disabled:text-slate-400"
                                disabled={!selectedSurah}
                                placeholder="1"
                              />
                            </div>

                            {/* To Ayah */}
                            <div className="sm:col-span-3">
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                To Ayah
                              </label>
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
                                  setForm((prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      [section.key]: { ...formSection, ranges: updatedRanges }
                                    }
                                  }));
                                }}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 disabled:bg-slate-100 disabled:text-slate-400"
                                disabled={!selectedSurah}
                                placeholder={selectedSurah ? String(Math.min(5, ayahCount)) : 'To'}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handleAddRange(section.key)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-3 text-xs font-bold text-teal-800 transition hover:border-teal-400 hover:bg-teal-50/50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Another Surah Range</span>
                    </button>
                  </div>

                  {/* Kaifiyat & Mistakes Grid */}
                  <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
                    {/* Kaifiyat Selection */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Kaifiyat (Rating)
                      </label>
                      <select
                        value={formSection.kaifiyat}
                        onChange={(e) =>
                          setSectionValue(section.key, { kaifiyat: e.target.value as KaifiyatValue })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                        required={section.key === 'sabaq'}
                      >
                        <option value="">Select Rating</option>
                        <option value="Excellent ⭐⭐⭐⭐⭐">Excellent ⭐⭐⭐⭐⭐</option>
                        <option value="Good ⭐⭐⭐⭐">Good ⭐⭐⭐⭐</option>
                        <option value="Average ⭐⭐⭐">Average ⭐⭐⭐</option>
                        <option value="Weak ⭐⭐">Weak ⭐⭐</option>
                      </select>
                    </div>

                    {/* Tajweedi Mistakes */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Tajweedi Mistakes
                      </label>
                      <div className="space-y-1.5">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={formSection.tajweeditotal}
                          onChange={(e) => setSectionValue(section.key, { tajweeditotal: e.target.value })}
                          placeholder="0"
                          className="h-11 w-full rounded-2xl border border-amber-200 bg-amber-50/40 px-3 text-sm font-black text-amber-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10"
                        />
                        <div className="flex flex-wrap gap-1">
                          {[0, 1, 2, 3, 5, 10].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSectionValue(section.key, { tajweeditotal: String(val) })}
                              className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold transition ${
                                formSection.tajweeditotal === String(val)
                                  ? 'border-amber-500 bg-amber-200 text-amber-900'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-amber-50'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Hifz Mistakes */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Hifz Mistakes
                      </label>
                      <div className="space-y-1.5">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={formSection.hifztotal}
                          onChange={(e) => setSectionValue(section.key, { hifztotal: e.target.value })}
                          placeholder="0"
                          className="h-11 w-full rounded-2xl border border-amber-200 bg-amber-50/40 px-3 text-sm font-black text-amber-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10"
                        />
                        <div className="flex flex-wrap gap-1">
                          {[0, 1, 2, 3, 5, 10].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSectionValue(section.key, { hifztotal: String(val) })}
                              className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold transition ${
                                formSection.hifztotal === String(val)
                                  ? 'border-amber-500 bg-amber-200 text-amber-900'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-amber-50'
                              }`}
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
          </form>
        </div>

        {/* Right Insights Column (Desktop Sidebar / Mobile Accordion) */}
        <div className="space-y-6 xl:col-span-4">
          {/* Performance Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Performance Summary</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="text-xs font-bold text-slate-500">Overall Rating</span>
                <span className="text-sm font-black text-teal-900">{summary.overallPerformance}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="text-xs font-bold text-slate-500">Total Mistakes</span>
                <span className={`text-sm font-black ${
                  summary.totalMistakes === 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {summary.totalMistakes} mistakes
                </span>
              </div>

              <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-3.5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  Pedagogical Suggestion
                </p>
                <p className="text-xs font-medium leading-relaxed text-teal-950">{summary.suggestion}</p>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < summary.avgStars ? 'fill-amber-400 text-amber-500' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Teacher Guidance Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold">Assessment Guidelines</h3>
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                <span>Keep new Sabaq length manageable based on recitation fluency.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                <span>If total mistakes exceed 3, pause lesson forward progress for revision.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                <span>Use &quot;Save &amp; Next Student&quot; for rapid class evaluations.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="sticky bottom-4 z-30 rounded-3xl border border-slate-200/80 bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl">
        {editingReportId && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">
            <span>You are currently editing a saved report.</span>
            <button
              type="button"
              onClick={cancelEditReport}
              className="text-xs font-black underline hover:text-amber-950"
            >
              Cancel Edit
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
            <span>Target:</span>
            <span className="font-bold text-slate-900">
              {selectedStudent ? selectedStudent.user.fullName : 'No student selected'}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {editingReportId && (
              <button
                type="button"
                onClick={cancelEditReport}
                disabled={saving}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-98 sm:w-auto"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                setSaveAndMoveNext(false);
                await submit({ preventDefault: () => {} } as React.FormEvent);
              }}
              disabled={saving || loading || featureDisabled}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-xs font-black text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800 active:scale-98 disabled:opacity-50 sm:w-auto"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? 'Saving...' : editingReportId ? 'Update Report' : 'Save Report'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setSaveAndMoveNext(true);
                await submit({ preventDefault: () => {} } as React.FormEvent);
              }}
              disabled={
                saving ||
                loading ||
                featureDisabled ||
                Boolean(editingReportId) ||
                !selectedStudents.some((s) => s.id > form.studentId)
              }
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-6 text-xs font-black text-teal-800 transition hover:bg-teal-100 active:scale-98 disabled:opacity-30 sm:w-auto"
            >
              <span>{saving ? 'Saving...' : 'Save & Next Student →'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Saved Reports Section */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Saved Daily Reports</h3>
            <p className="text-xs font-medium text-slate-500">
              {filteredReports.length} reports logged for selected filters
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white"
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={reportQuery}
                onChange={(e) => setReportQuery(e.target.value)}
                placeholder="Filter saved reports..."
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-600">No saved reports found</p>
            <p className="text-xs text-slate-400">Save a daily progress report above to populate this log.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((item) => {
              const parsed = parseStructuredNotes(item.notes);
              const stars = computeStars(parsed);
              const mistakes = computeReportMistakes(parsed);
              const sabaqLabel = getSectionLabelFromNotes(item.notes, 'sabaq');
              const isDetailsOpen = openReportId === item.id;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-teal-200 hover:bg-white hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {formatDateYMD(item.date)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < stars ? 'fill-amber-400 text-amber-500' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h4 className="mt-2.5 text-sm font-black text-slate-900">{item.student.user.fullName}</h4>
                    <p className="text-xs font-semibold text-slate-500">
                      {item.class.name} · {item.class.section}
                    </p>

                    <div className="mt-3 rounded-xl bg-white p-2.5 border border-slate-100">
                      <p className="text-[11px] font-bold text-teal-900">
                        <span className="text-slate-400 font-semibold mr-1">Sabaq:</span>
                        {sabaqLabel}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black ${
                        mistakes === 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {mistakes} Mistakes
                      </span>
                      {parsed?.overall && (
                        <span className="text-[10px] font-bold text-slate-500">
                          Grade: {parsed.overall}
                        </span>
                      )}
                    </div>

                    {/* Expandable Report Details Accordion */}
                    {isDetailsOpen && (
                      <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                        {parsed ? (
                          <>
                            {sectionMeta.map(({ key, title, icon }) => {
                              const sec = parsed.sections[key];
                              const rangeLabel = getSectionLabelFromNotes(item.notes, key);
                              return (
                                <div key={key} className="border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                  <p className="font-bold text-slate-800">{icon} {title}</p>
                                  <p className="text-[11px] text-slate-500">
                                    {rangeLabel} · {sec.kaifiyat || '-'} · T:{sec.tajweeditotal} H:{sec.hifztotal}
                                  </p>
                                </div>
                              );
                            })}
                            {parsed.suggestion && (
                              <div className="mt-1 rounded-lg bg-teal-50 p-2 text-[10px] font-semibold text-teal-900">
                                {parsed.suggestion}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-400">No structured data.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setOpenReportId((prev) => (prev === item.id ? null : item.id))}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{isDetailsOpen ? 'Hide' : 'Details'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditReport(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-teal-200 bg-teal-50 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-100 active:scale-95"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteReport(item)}
                      disabled={deletingReportId === item.id}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                      title="Delete Report"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
