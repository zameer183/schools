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
  Minus,
  BookOpen,
  GraduationCap,
  Users,
  Award,
  AlertTriangle,
  Flame,
  Check,
  RotateCcw,
  ArrowRight,
  Clock,
  UserCheck
} from 'lucide-react';
import { SURAH_LIST, getSurahById, resolveSurah, type Surah } from '@/lib/quran';

type ClassItem = {
  id: string;
  name: string;
  section: string;
};

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
  tajweeditotal: string; // 0-99
  hifztotal: string;     // 0-99
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



const sectionMeta: { key: SectionKey; title: string; titleUrdu: string; icon: string; subtitle: string }[] = [
  { key: 'sabaq', title: 'Sabaq', titleUrdu: 'Daily Lesson', icon: '📘', subtitle: 'New daily lesson tracking and recitation fluency' },
  { key: 'sabqi', title: 'Sabqi', titleUrdu: 'Recent Revision', icon: '📗', subtitle: 'Recent lessons revision assessment (Optional)' },
  { key: 'manzil', title: 'Manzil', titleUrdu: 'Major Revision', icon: '📙', subtitle: 'Long-term revision and consolidation (Optional)' }
];

const kaifiyatOptions: { label: KaifiyatValue; shortLabel: string; stars: number; color: string; bg: string; border: string }[] = [
  { label: 'Excellent ⭐⭐⭐⭐⭐', shortLabel: 'Excellent', stars: 5, color: 'text-emerald-700', bg: 'bg-emerald-50 hover:bg-emerald-100/80', border: 'border-emerald-300' },
  { label: 'Good ⭐⭐⭐⭐', shortLabel: 'Good', stars: 4, color: 'text-teal-700', bg: 'bg-teal-50 hover:bg-teal-100/80', border: 'border-teal-300' },
  { label: 'Average ⭐⭐⭐', shortLabel: 'Average', stars: 3, color: 'text-amber-700', bg: 'bg-amber-50 hover:bg-amber-100/80', border: 'border-amber-300' },
  { label: 'Weak ⭐⭐', shortLabel: 'Weak / Needs Revision', stars: 2, color: 'text-rose-700', bg: 'bg-rose-50 hover:bg-rose-100/80', border: 'border-rose-300' }
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
    tajweeditotal: '0',
    hifztotal: '0'
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
    }
    if (line.startsWith('TotalMistakes:')) {
      parsed.totalMistakes = Number(line.replace('TotalMistakes:', '').trim()) || 0;
    }
    if (line.startsWith('Suggestion:')) {
      parsed.suggestion = line.replace('Suggestion:', '').trim();
    }

    if (!currentSection) continue;

    if (line.startsWith('Range:')) {
      parsed.sections[currentSection].ranges.push({
        surahId: 0,
        surahName: '-',
        fromAyah: 1,
        toAyah: 1
      });
    }

    const currentRanges = parsed.sections[currentSection].ranges;
    const lastRange = currentRanges[currentRanges.length - 1];

    if (lastRange) {
      if (line.startsWith('SurahId:')) lastRange.surahId = Number(line.replace('SurahId:', '').trim()) || 0;
      if (line.startsWith('SurahName:')) lastRange.surahName = line.replace('SurahName:', '').trim();
      if (line.startsWith('FromAyah:')) lastRange.fromAyah = Number(line.replace('FromAyah:', '').trim()) || 1;
      if (line.startsWith('ToAyah:')) lastRange.toAyah = Number(line.replace('ToAyah:', '').trim()) || 1;
    }

    if (line.startsWith('Kaifiyat:')) {
      parsed.sections[currentSection].kaifiyat = (line.replace('Kaifiyat:', '').trim() || '') as Exclude<KaifiyatValue, ''> | '';
    }
    if (line.startsWith('TajweeditTotal:')) {
      parsed.sections[currentSection].tajweeditotal = Number(line.replace('TajweeditTotal:', '').trim()) || 0;
    }
    if (line.startsWith('HifzTotal:')) {
      parsed.sections[currentSection].hifztotal = Number(line.replace('HifzTotal:', '').trim()) || 0;
    }
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
    tajweeditotal: block.match(/TajweeditTotal:(\d+)/)?.[1] ?? '0',
    hifztotal: block.match(/HifzTotal:(\d+)/)?.[1] ?? '0'
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
    }, 3500);
  }, []);

  const selectedStudents = useMemo(() => {
    return students
      .filter((student) => !form.classId || (student.class && student.class.id === form.classId))
      .filter((student) => {
        const query = studentSearch.trim().toLowerCase();
        if (!query) return true;
        return (
          student.user.fullName.toLowerCase().includes(query) ||
          (student.admissionNo && student.admissionNo.toLowerCase().includes(query))
        );
      });
  }, [students, form.classId, studentSearch]);

  const selectedClass = classes.find((item) => item.id === form.classId);
  const selectedStudent = students.find((item) => item.id === form.studentId);

  // Filter saved reports
  const filteredReports = useMemo(() => {
    return progress.filter((item) => {
      const dateMatch = !reportDate || formatDateYMD(item.date) === reportDate;
      const nameMatch = !reportQuery || item.student.user.fullName.toLowerCase().includes(reportQuery.toLowerCase());
      return dateMatch && nameMatch;
    });
  }, [progress, reportDate, reportQuery]);

  // Previous Sabaq from history
  const previousReport = useMemo(() => {
    if (!progress.length) return null;
    return progress[0];
  }, [progress]);

  const previousSabaqLabel = useMemo(() => {
    if (!previousReport) return null;
    return getSectionLabelFromNotes(previousReport.notes, 'sabaq');
  }, [previousReport]);

  // Suggested Next Sabaq calculation
  const suggestedNextSabaq = useMemo(() => {
    if (!previousReport) return null;
    const parsed = parseStructuredNotes(previousReport.notes);
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
      return { surahId: currentSurah.id, fromAyah: nextFrom, toAyah: nextTo, label: `${currentSurah.name} (${nextFrom}-${nextTo})` };
    }

    const nextSurah = getSurahById(currentSurah.id + 1);
    if (!nextSurah) return null;
    return { surahId: nextSurah.id, fromAyah: 1, toAyah: Math.min(5, nextSurah.ayahs), label: `${nextSurah.name} (1-${Math.min(5, nextSurah.ayahs)})` };
  }, [previousReport]);

  const sectionBadges = useMemo(() => {
    const badges: Record<SectionKey, { rangeCount: number; mistakeCount: number; isFilled: boolean }> = {
      sabaq: { rangeCount: 0, mistakeCount: 0, isFilled: false },
      sabqi: { rangeCount: 0, mistakeCount: 0, isFilled: false },
      manzil: { rangeCount: 0, mistakeCount: 0, isFilled: false }
    };

    sectionMeta.forEach(({ key }) => {
      const section = form.sections[key];
      const filledRanges = section.ranges.filter((r) => r.surahId && r.fromAyah && r.toAyah).length;
      const taj = Number(section.tajweeditotal) || 0;
      const hifz = Number(section.hifztotal) || 0;
      badges[key] = {
        rangeCount: filledRanges,
        mistakeCount: taj + hifz,
        isFilled: filledRanges > 0 && Boolean(section.kaifiyat)
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
    let suggestion = 'Select rating and record recitation details.';

    if (avg >= 4.5 && totalMistakes <= 2) {
      overallPerformance = 'Excellent';
      suggestion = 'Strong progress & clear fluency. Continue forward lesson pace.';
    } else if (avg >= 3.5 && totalMistakes <= 4) {
      overallPerformance = 'Good';
      suggestion = 'Good recitation. Spend 5-10 minutes revising minor tajweed rules.';
    } else if (avg >= 2.5) {
      overallPerformance = 'Average';
      suggestion = 'Needs improvement in Tajweed & Hifz. Keep shorter ayaat for revision.';
    } else if (avg > 0) {
      overallPerformance = 'Needs Revision';
      suggestion = 'Pause lesson forward progress. Consolidate current verses thoroughly.';
    }

    return {
      overallPerformance,
      totalMistakes,
      suggestion,
      avgStars: Math.round(avg)
    };
  }, [form.sections]);

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

      // Auto-select first class if none selected
      if (!form.classId && classList.length > 0) {
        setForm((prev) => ({ ...prev, classId: classList[0].id }));
      }
      setFeatureDisabled(false);
    } catch {
      addNotice('error', 'Network error loading classes and students.');
    } finally {
      setLoading(false);
    }
  }, [addNotice, form.classId]);

  const loadProgressData = useCallback(async () => {
    if (!form.classId && !form.studentId) return;

    try {
      const params = new URLSearchParams();
      if (form.classId) params.set('classId', form.classId);
      if (form.studentId) params.set('studentId', form.studentId);

      const response = await fetch(`/api/progress?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 403) setFeatureDisabled(true);
        return;
      }

      const json = await response.json();
      setProgress(Array.isArray(json) ? json : []);
      setFeatureDisabled(false);
    } catch {
      addNotice('error', 'Failed to load progress records.');
    }
  }, [form.classId, form.studentId, addNotice]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadProgressData();
  }, [loadProgressData]);

  // When class changes, ensure student belongs to class
  useEffect(() => {
    if (form.classId && selectedStudents.length > 0) {
      const currentValid = selectedStudents.some((s) => s.id === form.studentId);
      if (!currentValid) {
        setForm((prev) => ({ ...prev, studentId: selectedStudents[0].id }));
      }
    }
  }, [form.classId, selectedStudents, form.studentId]);

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

  // Surah selector handler: auto-populates sensible default ayah ranges
  const handleSurahInput = (sectionKey: SectionKey, rangeIndex: number, value: string) => {
    const resolved = resolveSurah(value);
    const current = form.sections[sectionKey];
    const updatedRanges = [...current.ranges];

    if (!resolved) {
      updatedRanges[rangeIndex] = {
        ...updatedRanges[rangeIndex],
        surahInput: value,
        surahId: null
      };
    } else {
      const existingFrom = updatedRanges[rangeIndex].fromAyah;
      const existingTo = updatedRanges[rangeIndex].toAyah;

      const from = existingFrom ? Math.min(Number(existingFrom), resolved.ayahs) : 1;
      const to = existingTo ? Math.min(Number(existingTo), resolved.ayahs) : Math.min(from + 4, resolved.ayahs);

      updatedRanges[rangeIndex] = {
        ...updatedRanges[rangeIndex],
        surahInput: `${resolved.id}. ${resolved.name}`,
        surahId: resolved.id,
        fromAyah: String(from),
        toAyah: String(to)
      };
    }

    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: { ...current, ranges: updatedRanges }
      }
    }));
  };

  // Ayah number change without keystroke locking
  const handleAyahChange = (sectionKey: SectionKey, rangeIndex: number, field: 'fromAyah' | 'toAyah', value: string) => {
    // Only accept numeric digits
    const digitsOnly = value.replace(/[^0-9]/g, '');
    const current = form.sections[sectionKey];
    const updatedRanges = [...current.ranges];

    updatedRanges[rangeIndex] = {
      ...updatedRanges[rangeIndex],
      [field]: digitsOnly
    };

    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: { ...current, ranges: updatedRanges }
      }
    }));
  };

  // Validate on blur: DO NOT clamp! Alert teacher if number exceeds extreme value
  const handleAyahBlur = (sectionKey: SectionKey, rangeIndex: number, field: 'fromAyah' | 'toAyah') => {
    const current = form.sections[sectionKey];
    const range = current.ranges[rangeIndex];
    const surah = getSurahById(range.surahId);
    if (!surah) return;

    const raw = range[field];
    if (!raw) return;

    const num = Number(raw);
    if (!Number.isFinite(num)) return;

    if (num > surah.ayahs) {
      addNotice(
        'error',
        `⚠️ Surah ${surah.name} has ${surah.ayahs} ayahs. You cannot enter an ayah number greater than ${surah.ayahs}. (Maximum limit: ${surah.ayahs})`
      );
    } else if (num < 1) {
      addNotice('error', '⚠️ Ayah number must be at least 1.');
    }
  };

  // Quick ayah helper chips
  const applyAyahChip = (sectionKey: SectionKey, rangeIndex: number, type: '+5' | '+10' | 'ALL') => {
    const current = form.sections[sectionKey];
    const range = current.ranges[rangeIndex];
    const surah = getSurahById(range.surahId);
    if (!surah) return;

    const from = Number(range.fromAyah) || 1;
    let newTo = from;

    if (type === '+5') newTo = Math.min(surah.ayahs, from + 4);
    if (type === '+10') newTo = Math.min(surah.ayahs, from + 9);
    if (type === 'ALL') {
      const updatedRanges = [...current.ranges];
      updatedRanges[rangeIndex] = { ...range, fromAyah: '1', toAyah: String(surah.ayahs) };
      setForm((prev) => ({ ...prev, sections: { ...prev.sections, [sectionKey]: { ...current, ranges: updatedRanges } } }));
      return;
    }

    const updatedRanges = [...current.ranges];
    updatedRanges[rangeIndex] = { ...range, toAyah: String(newTo) };
    setForm((prev) => ({ ...prev, sections: { ...prev.sections, [sectionKey]: { ...current, ranges: updatedRanges } } }));
  };

  // Add & Remove Surah Ranges
  const handleAddRange = (sectionKey: SectionKey) => {
    const current = form.sections[sectionKey];
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: { ...current, ranges: [...current.ranges, emptyRange()] }
      }
    }));
  };

  const handleRemoveRange = (sectionKey: SectionKey, rangeIndex: number) => {
    const current = form.sections[sectionKey];
    const updatedRanges = current.ranges.filter((_, i) => i !== rangeIndex);
    if (updatedRanges.length === 0) {
      updatedRanges.push(emptyRange());
    }
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: { ...current, ranges: updatedRanges }
      }
    }));
  };

  // Mistake Stepper & Presets
  const adjustMistake = (sectionKey: SectionKey, field: 'tajweeditotal' | 'hifztotal', delta: number) => {
    const currentVal = Number(form.sections[sectionKey][field]) || 0;
    const newVal = Math.max(0, Math.min(99, currentVal + delta));
    setSectionValue(sectionKey, { [field]: String(newVal) });
  };

  const setMistakeCount = (sectionKey: SectionKey, field: 'tajweeditotal' | 'hifztotal', count: number) => {
    setSectionValue(sectionKey, { [field]: String(count) });
  };

  // Apply Auto Suggestion for Next Sabaq
  const applyAutoSuggestion = () => {
    if (!suggestedNextSabaq) return;
    const surah = getSurahById(suggestedNextSabaq.surahId);
    if (!surah) return;

    const sabaqRanges = [
      {
        id: undefined,
        surahInput: `${surah.id}. ${surah.name}`,
        surahId: surah.id,
        fromAyah: String(suggestedNextSabaq.fromAyah),
        toAyah: String(suggestedNextSabaq.toAyah)
      }
    ];

    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        sabaq: { ...prev.sections.sabaq, ranges: sabaqRanges }
      }
    }));
    setActiveTab('sabaq');
    addNotice('info', `Auto-loaded next lesson: ${suggestedNextSabaq.label}`);
  };

  // Form Validation
  const validateForm = () => {
    if (!form.date) return 'Please select an assessment date.';
    if (!form.classId) return 'Please select a class.';
    if (!form.studentId) return 'Please select a student.';

    // Check sabaq (daily lesson is primary)
    const sabaq = form.sections.sabaq;
    const sabaqValidRanges = sabaq.ranges.filter((r) => r.surahId && r.fromAyah && r.toAyah);

    // Filter out completely blank ranges from validation
    for (const { key, title } of sectionMeta) {
      const section = form.sections[key];
      const validRanges = section.ranges.filter((r) => r.surahId || r.fromAyah || r.toAyah || r.surahInput.trim());

      for (let i = 0; i < validRanges.length; i++) {
        const r = validRanges[i];
        if (!r.surahId) return `${title} Range ${i + 1}: Please select a Surah.`;
        const surah = getSurahById(r.surahId);
        if (!surah) return `${title} Range ${i + 1}: Please select a valid Surah.`;
        if (!r.fromAyah || !r.toAyah) return `${title} Range ${i + 1}: Enter both From and To Ayah numbers.`;

        const fromNum = Number(r.fromAyah);
        const toNum = Number(r.toAyah);

        if (!Number.isFinite(fromNum) || fromNum < 1) {
          return `${title} Range ${i + 1}: From Ayah must be at least 1.`;
        }
        if (fromNum > surah.ayahs) {
          return `${title} Range ${i + 1}: Surah ${surah.name} has ${surah.ayahs} ayahs. You cannot enter an ayah number (${fromNum}) greater than ${surah.ayahs}. (Maximum limit: ${surah.ayahs})`;
        }

        if (!Number.isFinite(toNum) || toNum < 1) {
          return `${title} Range ${i + 1}: To Ayah must be at least 1.`;
        }
        if (toNum > surah.ayahs) {
          return `${title} Range ${i + 1}: Surah ${surah.name} has ${surah.ayahs} ayahs. You cannot enter an ayah number (${toNum}) greater than ${surah.ayahs}. (Maximum limit: ${surah.ayahs})`;
        }

        if (fromNum > toNum) {
          return `${title} Range ${i + 1}: From Ayah (${fromNum}) cannot be greater than To Ayah (${toNum}).`;
        }
      }

      if (validRanges.length > 0 && !section.kaifiyat) {
        return `${title}: Please select Kaifiyat (Performance Rating).`;
      }
    }

    // Ensure at least one section has valid ranges
    const anyFilled = sectionMeta.some((meta) => {
      const sec = form.sections[meta.key];
      return sec.ranges.some((r) => r.surahId && r.fromAyah && r.toAyah) && Boolean(sec.kaifiyat);
    });

    if (!anyFilled) {
      return 'Please complete at least Sabaq (Surah, Ayahs, and Rating).';
    }

    return null;
  };

  const buildStructuredNotes = () => {
    const lines: string[] = ['Daily Progress Report'];

    sectionMeta.forEach(({ key, title }) => {
      const section = form.sections[key];
      lines.push(`[${title.toUpperCase()}]`);

      section.ranges.forEach((range, idx) => {
        if (!range.surahId && !range.fromAyah && !range.toAyah) return;
        const surah = getSurahById(range.surahId);
        lines.push(`Range:${idx + 1}`);
        lines.push(`SurahId:${surah?.id ?? ''}`);
        lines.push(`SurahName:${surah?.name ?? '-'}`);
        lines.push(`FromAyah:${range.fromAyah}`);
        lines.push(`ToAyah:${range.toAyah}`);
      });

      lines.push(`Kaifiyat:${section.kaifiyat || '-'}`);
      lines.push(`TajweeditTotal:${section.tajweeditotal || '0'}`);
      lines.push(`HifzTotal:${section.hifztotal || '0'}`);
    });

    lines.push('[SUMMARY]');
    lines.push(`OverallPerformance:${summary.overallPerformance}`);
    lines.push(`TotalMistakes:${summary.totalMistakes}`);
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

      const activeSectionWithRanges = sectionMeta.find(({ key }) => (surahRangesData[key] || []).length > 0);
      const activeRanges = activeSectionWithRanges ? surahRangesData[activeSectionWithRanges.key] : [];
      const firstRange = activeRanges[0];
      const lastRange = activeRanges[activeRanges.length - 1];

      const fromA = Number(firstRange?.fromAyah || 1);
      const toA = Number(lastRange?.toAyah || fromA);
      const safeFromA = Math.min(fromA, toA);
      const safeToA = Math.max(fromA, toA);

      const rawTajweedi = form.sections.sabaq.tajweeditotal !== '' ? Number(form.sections.sabaq.tajweeditotal) : 0;
      const rawHifz = form.sections.sabaq.hifztotal !== '' ? Number(form.sections.sabaq.hifztotal) : 0;

      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          classId: form.classId,
          studentId: form.studentId,
          lessonType: 'SURAH',
          lessonNumber: safeFromA,
          ayahFrom: safeFromA,
          ayahTo: safeToA,
          tajweeditotal: Number.isFinite(rawTajweedi) ? rawTajweedi : 0,
          hifzTotal: Number.isFinite(rawHifz) ? rawHifz : 0,
          surahRanges: surahRangesData,
          notes: buildStructuredNotes()
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        addNotice('error', typeof json?.error === 'string' ? json.error : 'Unable to save report.');
        return;
      }

      addNotice('success', editingReportId ? 'Quran progress report updated successfully!' : 'Quran progress report saved successfully!');
      setEditingReportId(null);

      // Handle Save & Move to Next Student
      if (saveAndMoveNext) {
        setSaveAndMoveNext(false);
        const currentIndex = selectedStudents.findIndex((s) => s.id === form.studentId);
        const nextStudent = currentIndex !== -1 && currentIndex < selectedStudents.length - 1 ? selectedStudents[currentIndex + 1] : null;

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
          setActiveTab('sabaq');
          addNotice('info', `Moved to next student: ${nextStudent.user.fullName}`);
        } else {
          setForm((prev) => ({
            ...prev,
            sections: {
              sabaq: emptySection(),
              sabqi: emptySection(),
              manzil: emptySection()
            }
          }));
          addNotice('info', 'All students in this class evaluated! 🎉');
        }
      } else {
        // Reset inputs for same student or next entry
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
      addNotice('error', 'Request failed. Please check network connection.');
    } finally {
      setSaving(false);
    }
  };

  const nextStudentInClass = useMemo(() => {
    if (!selectedStudents.length || !form.studentId) return null;
    const currentIndex = selectedStudents.findIndex((s) => s.id === form.studentId);
    return currentIndex !== -1 && currentIndex < selectedStudents.length - 1 ? selectedStudents[currentIndex + 1] : null;
  }, [selectedStudents, form.studentId]);

  return (
    <div className="w-full space-y-6 pb-36 text-slate-800">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 p-6 text-white shadow-xl shadow-teal-950/15 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-400/15 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-sm">
              <BookOpenCheck className="h-3.5 w-3.5" />
              <span>Daily Quran Progress Report</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Quran Recitation & Hifz Assessment
            </h1>
            <p className="text-xs font-medium text-teal-100/80 sm:text-sm">
              Clean, effortless tracking for Sabaq, Sabqi, and Manzil revisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-md sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Date</p>
              <p className="text-sm font-black text-white">{form.date || todayDateYMD()}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur-md shadow-inner text-teal-200">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Notifications Bar */}
        {notifications.length > 0 && (
          <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
            {notifications.map((notice) => (
              <div
                key={notice.id}
                className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-lg backdrop-blur-md transition-all ${
                  notice.type === 'success'
                    ? 'border border-emerald-400/30 bg-emerald-500/25 text-emerald-100'
                    : notice.type === 'error'
                      ? 'border border-rose-400/30 bg-rose-500/25 text-rose-100'
                      : 'border border-teal-400/30 bg-teal-500/25 text-teal-100'
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

      {/* ─── Main Two-Column Layout ─── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Assessment Column */}
        <div className="space-y-6 xl:col-span-8">
          <form onSubmit={submit} className="space-y-6">
            {/* 1. Unified Session & Student Selection Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Student & Class Selection</h2>
                    <p className="text-xs font-medium text-slate-500">Select date, class, and the student being assessed</p>
                  </div>
                </div>
                {selectedStudents.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {selectedStudents.length} Students
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {/* Date */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assessment Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                    required
                  />
                </div>

                {/* Class */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Class & Section
                  </label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value, studentId: '' }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
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

                {/* Student Filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Search Student
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name or ID..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                    />
                  </div>
                </div>
              </div>

              {/* Student Dropdown */}
              <div className="mt-3.5">
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Student Target</span>
                  {selectedStudent && (
                    <span className="font-semibold text-teal-700">
                      Admission #{selectedStudent.admissionNo || 'N/A'}
                    </span>
                  )}
                </label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
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

              {/* Student Context & Previous Lesson Ribbon */}
              {selectedStudent && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 font-black text-white shadow-sm">
                      {selectedStudent.user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{selectedStudent.user.fullName}</span>
                        <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                          {selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : 'Student'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        {previousSabaqLabel ? (
                          <span>
                            Last Sabaq: <strong className="text-teal-900">{previousSabaqLabel}</strong>
                          </span>
                        ) : (
                          <span className="text-slate-400">No previous progress record found.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Auto Next Lesson Button */}
                  {suggestedNextSabaq && (
                    <button
                      type="button"
                      onClick={applyAutoSuggestion}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-teal-200" />
                      <span>Next: {suggestedNextSabaq.label}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Modern Segmented Tab Bar (Sabaq, Sabqi, Manzil) */}
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
                        ? 'bg-white text-teal-950 shadow-md shadow-slate-900/5 ring-1 ring-black/5'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{section.icon}</span>
                      <span className="text-xs font-black sm:text-sm">{section.title}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-1">
                      {badge.isFilled ? (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          ✓ Ready
                        </span>
                      ) : (
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-300/60 text-slate-700'
                        }`}>
                          {section.key === 'sabaq' ? 'Required' : 'Optional'}
                        </span>
                      )}

                      {badge.mistakeCount > 0 && (
                        <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-800">
                          {badge.mistakeCount} ✗
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 3. Active Section Assessment Card */}
            {sectionMeta.map((section) => {
              if (activeTab !== section.key) return null;
              const formSection = form.sections[section.key];

              return (
                <div key={section.key} className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  {/* Section Title Header */}
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{section.icon}</span>
                        <h3 className="text-lg font-black text-slate-900">{section.titleUrdu}</h3>
                        {section.key !== 'sabaq' && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                            Optional Section
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{section.subtitle}</p>
                    </div>

                    {formSection.kaifiyat && (
                      <div className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-50 px-3.5 py-1.5 text-xs font-black text-teal-900 border border-teal-200">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        <span>{formSection.kaifiyat}</span>
                      </div>
                    )}
                  </div>

                  {/* ── Surah Ranges Section (Smooth Number Inputs) ── */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Surah & Ayah Ranges ({formSection.ranges.length})
                      </label>
                      <span className="text-[11px] font-medium text-slate-400">
                        Type numbers freely or click chips
                      </span>
                    </div>

                    {formSection.ranges.map((range, rangeIdx) => {
                      const selectedSurah = getSurahById(range.surahId || 0);
                      const ayahCount = selectedSurah?.ayahs ?? 0;

                      const fromNum = range.fromAyah ? Number(range.fromAyah) : null;
                      const toNum = range.toAyah ? Number(range.toAyah) : null;

                      const fromError = selectedSurah && fromNum !== null && Number.isFinite(fromNum) && (fromNum < 1 || fromNum > ayahCount)
                        ? fromNum > ayahCount
                          ? `Surah ${selectedSurah.name} has ${ayahCount} ayahs. You cannot enter an ayah number (${fromNum}) greater than ${ayahCount}. (Maximum limit: ${ayahCount})`
                          : 'Ayah number must be at least 1.'
                        : null;

                      const toError = selectedSurah && toNum !== null && Number.isFinite(toNum) && (toNum < 1 || toNum > ayahCount)
                        ? toNum > ayahCount
                          ? `Surah ${selectedSurah.name} has ${ayahCount} ayahs. You cannot enter an ayah number (${toNum}) greater than ${ayahCount}. (Maximum limit: ${ayahCount})`
                          : 'Ayah number must be at least 1.'
                        : null;

                      const orderError = fromNum !== null && toNum !== null && Number.isFinite(fromNum) && Number.isFinite(toNum) && fromNum > toNum && !fromError && !toError
                        ? `From Ayah (${fromNum}) cannot be greater than To Ayah (${toNum}).`
                        : null;

                      return (
                        <div
                          key={rangeIdx}
                          className={`rounded-2xl border p-4 transition ${
                            fromError || toError || orderError
                              ? 'border-rose-300 bg-rose-50/30'
                              : 'border-slate-200 bg-slate-50/70 focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-sm'
                          }`}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-700 text-xs font-black text-white">
                                {rangeIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                Range #{rangeIdx + 1} {rangeIdx > 0 && <span className="text-teal-700 font-semibold">(Additional Range)</span>}
                              </span>
                              {selectedSurah && (
                                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
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
                              <span>{formSection.ranges.length > 1 ? 'Remove Range' : 'Clear'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                            {/* Surah dropdown */}
                            <div className="sm:col-span-6">
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Select Surah
                              </label>
                              <select
                                value={selectedSurah ? `${selectedSurah.id}. ${selectedSurah.name}` : ''}
                                onChange={(e) => handleSurahInput(section.key, rangeIdx, e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10"
                                required={section.key === 'sabaq'}
                              >
                                <option value="">Select Surah...</option>
                                {SURAH_LIST.map((surah) => (
                                  <option key={surah.id} value={`${surah.id}. ${surah.name}`}>
                                    {surah.id}. {surah.name} ({surah.ayahs} Ayahs)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* From Ayah */}
                            <div className="sm:col-span-3">
                              <div className="mb-1 flex items-center justify-between">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  From Ayah
                                </label>
                                {selectedSurah && (
                                  <span className="text-[10px] font-bold text-slate-400">1 - {ayahCount}</span>
                                )}
                              </div>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={range.fromAyah}
                                onChange={(e) => handleAyahChange(section.key, rangeIdx, 'fromAyah', e.target.value)}
                                onBlur={() => handleAyahBlur(section.key, rangeIdx, 'fromAyah')}
                                disabled={!selectedSurah}
                                placeholder="1"
                                className={`h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none transition disabled:bg-slate-100 disabled:text-slate-400 ${
                                  fromError
                                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-200 focus:border-rose-600'
                                    : 'border-slate-200 bg-white text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10'
                                }`}
                              />
                              {fromError && (
                                <p className="mt-1 flex items-start gap-1 text-[11px] font-bold text-rose-600 leading-tight">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                                  <span>{fromError}</span>
                                </p>
                              )}
                            </div>

                            {/* To Ayah (Doosra Number) */}
                            <div className="sm:col-span-3">
                              <div className="mb-1 flex items-center justify-between">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  To Ayah
                                </label>
                                {selectedSurah && (
                                  <span className="text-[10px] font-bold text-slate-400">Max: {ayahCount}</span>
                                )}
                              </div>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={range.toAyah}
                                onChange={(e) => handleAyahChange(section.key, rangeIdx, 'toAyah', e.target.value)}
                                onBlur={() => handleAyahBlur(section.key, rangeIdx, 'toAyah')}
                                disabled={!selectedSurah}
                                placeholder={selectedSurah ? String(Math.min(5, ayahCount)) : 'To'}
                                className={`h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none transition disabled:bg-slate-100 disabled:text-slate-400 ${
                                  toError
                                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-200 focus:border-rose-600'
                                    : 'border-slate-200 bg-white text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10'
                                }`}
                              />
                              {toError && (
                                <p className="mt-1 flex items-start gap-1 text-[11px] font-bold text-rose-600 leading-tight">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                                  <span>{toError}</span>
                                </p>
                              )}
                            </div>

                            {orderError && (
                              <div className="col-span-full flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">
                                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                                <span>{orderError}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Ayah Increment Helpers */}
                          {selectedSurah && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] font-bold text-slate-400">Quick Range:</span>
                              <button
                                type="button"
                                onClick={() => applyAyahChip(section.key, rangeIdx, '+5')}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50"
                              >
                                +5 Ayahs
                              </button>
                              <button
                                type="button"
                                onClick={() => applyAyahChip(section.key, rangeIdx, '+10')}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50"
                              >
                                +10 Ayahs
                              </button>
                              <button
                                type="button"
                                onClick={() => applyAyahChip(section.key, rangeIdx, 'ALL')}
                                className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 transition hover:bg-teal-100"
                              >
                                Whole Surah ({ayahCount} Ayahs)
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Another Surah Range Button */}
                    <button
                      type="button"
                      onClick={() => handleAddRange(section.key)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30 py-3 text-xs font-bold text-teal-800 transition hover:border-teal-400 hover:bg-teal-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>+ Add Another Surah Range</span>
                    </button>
                  </div>

                  {/* ── Kaifiyat (Rating Cards) ── */}
                  <div className="space-y-2.5 pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Recitation Quality / Fluency *
                    </label>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {kaifiyatOptions.map((opt) => {
                        const isSelected = formSection.kaifiyat === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setSectionValue(section.key, { kaifiyat: opt.label })}
                            className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition active:scale-95 ${
                              isSelected
                                ? `${opt.border} ${opt.bg} ring-2 ring-teal-500/20 shadow-sm font-black`
                                : 'border-slate-200 bg-white hover:bg-slate-50 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              {Array.from({ length: opt.stars }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-500" />
                              ))}
                            </div>
                            <span className={`mt-1 text-xs ${opt.color}`}>{opt.shortLabel}</span>
                            {isSelected && (
                              <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-teal-700 px-2 py-0.5 text-[9px] font-extrabold text-white">
                                <Check className="h-2.5 w-2.5" /> Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Mistakes Stepper & Quick Pills ── */}
                  <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                    {/* Tajweedi Mistakes */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Tajweed Mistakes
                        </label>
                        <span className="text-xs font-black text-teal-800">
                          {formSection.tajweeditotal || '0'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustMistake(section.key, 'tajweeditotal', -1)}
                          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={formSection.tajweeditotal}
                          onChange={(e) => setSectionValue(section.key, { tajweeditotal: e.target.value.replace(/\D/g, '') })}
                          className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-center text-base font-black text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10"
                        />

                        <button
                          type="button"
                          onClick={() => adjustMistake(section.key, 'tajweeditotal', 1)}
                          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Quick Chips */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {[0, 1, 2, 3, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setMistakeCount(section.key, 'tajweeditotal', val)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                              formSection.tajweeditotal === String(val)
                                ? 'border-teal-600 bg-teal-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-teal-50'
                            }`}
                          >
                            {val === 0 ? '0 (Clean ✓)' : val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hifz Mistakes */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Hifz Mistakes
                        </label>
                        <span className="text-xs font-black text-amber-800">
                          {formSection.hifztotal || '0'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustMistake(section.key, 'hifztotal', -1)}
                          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={formSection.hifztotal}
                          onChange={(e) => setSectionValue(section.key, { hifztotal: e.target.value.replace(/\D/g, '') })}
                          className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-center text-base font-black text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10"
                        />

                        <button
                          type="button"
                          onClick={() => adjustMistake(section.key, 'hifztotal', 1)}
                          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Quick Chips */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {[0, 1, 2, 3, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setMistakeCount(section.key, 'hifztotal', val)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                              formSection.hifztotal === String(val)
                                ? 'border-amber-600 bg-amber-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-amber-50'
                            }`}
                          >
                            {val === 0 ? '0 (Clean ✓)' : val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </form>
        </div>

        {/* ─── Right Live Feedback & Insights Column ─── */}
        <div className="space-y-6 xl:col-span-4">
          {/* Live Performance Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Performance Summary</h3>
                <p className="text-[11px] font-medium text-slate-400">Calculated in real-time</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
                <span className="text-xs font-bold text-slate-500">Overall Grade</span>
                <span className="text-sm font-black text-teal-900">{summary.overallPerformance}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5">
                <span className="text-xs font-bold text-slate-500">Total Mistakes</span>
                <span
                  className={`text-sm font-black ${
                    summary.totalMistakes === 0
                      ? 'text-emerald-700'
                      : summary.totalMistakes <= 3
                        ? 'text-amber-700'
                        : 'text-rose-700'
                  }`}
                >
                  {summary.totalMistakes} {summary.totalMistakes === 1 ? 'mistake' : 'mistakes'}
                </span>
              </div>

              {/* Dynamic Pedagogical Suggestion */}
              <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  Pedagogical Recommendation
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

          {/* Quick Guidelines Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-bold">Teacher Quick Tips</h3>
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                <span><strong>No typing lock:</strong> You can enter any Ayah number (e.g. 15, 25, 114) directly without constraint.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                <span>Use <strong>&quot;Save &amp; Next Student&quot;</strong> to evaluate the whole class consecutively.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                <span>Sabqi and Manzil sections are optional; Sabaq is primary.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Floating Sticky Action Bar ─── */}
      <div className="sticky bottom-4 z-30 rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
        {editingReportId && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">
            <span>You are currently updating an existing progress report.</span>
            <button
              type="button"
              onClick={cancelEditReport}
              className="text-xs font-black underline hover:text-amber-950"
            >
              Cancel Edit
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Student</p>
              <p className="text-sm font-black text-slate-900">
                {selectedStudent ? selectedStudent.user.fullName : 'No student selected'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {editingReportId && (
              <button
                type="button"
                onClick={cancelEditReport}
                disabled={saving}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 sm:w-auto"
              >
                Cancel
              </button>
            )}

            {/* Save Report (Primary) */}
            <button
              type="button"
              onClick={async () => {
                setSaveAndMoveNext(false);
                await submit({ preventDefault: () => {} } as React.FormEvent);
              }}
              disabled={saving || loading || featureDisabled}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-7 text-xs font-black text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800 active:scale-95 disabled:opacity-50 sm:w-auto"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>{saving ? 'Saving...' : editingReportId ? 'Update Report' : 'Save Report'}</span>
            </button>

            {/* Save & Move Next */}
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
                !nextStudentInClass
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-teal-300 bg-teal-50 px-6 text-xs font-black text-teal-800 transition hover:bg-teal-100 active:scale-95 disabled:opacity-40 sm:w-auto"
            >
              <span>{saving ? 'Saving...' : 'Save & Next Student →'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Saved Daily Reports Log Section ─── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Saved Daily Progress Reports</h3>
            <p className="text-xs font-medium text-slate-500">
              {filteredReports.length} reports recorded for the selected filters
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
                placeholder="Filter reports by student..."
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
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black ${
                          mistakes === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {mistakes} {mistakes === 1 ? 'Mistake' : 'Mistakes'}
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
                                  <p className="font-bold text-slate-800">
                                    {icon} {title}
                                  </p>
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
