'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type LessonType = 'JUZZ' | 'SURAH';

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
  lessonType: LessonType;
  juzzNumber: number | null;
  lessonNumber: number;
  ayahFrom: number | null;
  ayahTo: number | null;
  notes: string | null;
  student: { user: { fullName: string } };
  class: { name: string; section: string };
};

type Surah = { number: number; name: string; ayahCount: number };

type Juzz = { number: number; name: string };

const juzzList: Juzz[] = [
  { number: 1, name: 'Alif Lam Meem' },
  { number: 2, name: 'Sayaqool' },
  { number: 3, name: 'Tilka Rusul' },
  { number: 4, name: 'Lan Tanaaloo' },
  { number: 5, name: 'Wal Mohsanat' },
  { number: 6, name: 'La Yuhibbullah' },
  { number: 7, name: 'Wa Iza Samiu' },
  { number: 8, name: 'Wa Lau Annana' },
  { number: 9, name: 'Qalal Malao' },
  { number: 10, name: 'Wa Alamo' },
  { number: 11, name: 'Yatazeroon' },
  { number: 12, name: 'Wa Mamin Daabbah' },
  { number: 13, name: 'Wa Ma Ubrioo' },
  { number: 14, name: 'Rubama' },
  { number: 15, name: 'Subhanallazi' },
  { number: 16, name: 'Qal Alam' },
  { number: 17, name: 'Aqtaraba' },
  { number: 18, name: 'Qadd Aflaha' },
  { number: 19, name: 'Wa Qalallazina' },
  { number: 20, name: 'Aman Khalaq' },
  { number: 21, name: 'Utlu Ma Oohi' },
  { number: 22, name: 'Wa Manyaqnut' },
  { number: 23, name: 'Wa Mali' },
  { number: 24, name: 'Faman Azlam' },
  { number: 25, name: 'Elahe Yuruddo' },
  { number: 26, name: 'Ha Meem' },
  { number: 27, name: 'Qala Fama Khatbukum' },
  { number: 28, name: 'Qadd Sami Allah' },
  { number: 29, name: 'Tabarakallazi' },
  { number: 30, name: 'Amma Yatasaaloon' }
];

const surahList: Surah[] = [
  { number: 1, name: 'Al-Fatihah', ayahCount: 7 },
  { number: 2, name: 'Al-Baqarah', ayahCount: 286 },
  { number: 3, name: "Ali 'Imran", ayahCount: 200 },
  { number: 4, name: 'An-Nisa', ayahCount: 176 },
  { number: 5, name: "Al-Ma'idah", ayahCount: 120 },
  { number: 6, name: "Al-An'am", ayahCount: 165 },
  { number: 7, name: "Al-A'raf", ayahCount: 206 },
  { number: 8, name: 'Al-Anfal', ayahCount: 75 },
  { number: 9, name: 'At-Tawbah', ayahCount: 129 },
  { number: 10, name: 'Yunus', ayahCount: 109 },
  { number: 11, name: 'Hud', ayahCount: 123 },
  { number: 12, name: 'Yusuf', ayahCount: 111 },
  { number: 13, name: "Ar-Ra'd", ayahCount: 43 },
  { number: 14, name: 'Ibrahim', ayahCount: 52 },
  { number: 15, name: 'Al-Hijr', ayahCount: 99 },
  { number: 16, name: 'An-Nahl', ayahCount: 128 },
  { number: 17, name: 'Al-Isra', ayahCount: 111 },
  { number: 18, name: 'Al-Kahf', ayahCount: 110 },
  { number: 19, name: 'Maryam', ayahCount: 98 },
  { number: 20, name: 'Ta-Ha', ayahCount: 135 },
  { number: 21, name: 'Al-Anbiya', ayahCount: 112 },
  { number: 22, name: 'Al-Hajj', ayahCount: 78 },
  { number: 23, name: "Al-Mu'minun", ayahCount: 118 },
  { number: 24, name: 'An-Nur', ayahCount: 64 },
  { number: 25, name: 'Al-Furqan', ayahCount: 77 },
  { number: 26, name: "Ash-Shu'ara", ayahCount: 227 },
  { number: 27, name: 'An-Naml', ayahCount: 93 },
  { number: 28, name: 'Al-Qasas', ayahCount: 88 },
  { number: 29, name: 'Al-Ankabut', ayahCount: 69 },
  { number: 30, name: 'Ar-Rum', ayahCount: 60 },
  { number: 31, name: 'Luqman', ayahCount: 34 },
  { number: 32, name: 'As-Sajdah', ayahCount: 30 },
  { number: 33, name: 'Al-Ahzab', ayahCount: 73 },
  { number: 34, name: 'Saba', ayahCount: 54 },
  { number: 35, name: 'Fatir', ayahCount: 45 },
  { number: 36, name: 'Ya-Sin', ayahCount: 83 },
  { number: 37, name: 'As-Saffat', ayahCount: 182 },
  { number: 38, name: 'Sad', ayahCount: 88 },
  { number: 39, name: 'Az-Zumar', ayahCount: 75 },
  { number: 40, name: 'Ghafir', ayahCount: 85 },
  { number: 41, name: 'Fussilat', ayahCount: 54 },
  { number: 42, name: 'Ash-Shura', ayahCount: 53 },
  { number: 43, name: 'Az-Zukhruf', ayahCount: 89 },
  { number: 44, name: 'Ad-Dukhan', ayahCount: 59 },
  { number: 45, name: 'Al-Jathiyah', ayahCount: 37 },
  { number: 46, name: 'Al-Ahqaf', ayahCount: 35 },
  { number: 47, name: 'Muhammad', ayahCount: 38 },
  { number: 48, name: 'Al-Fath', ayahCount: 29 },
  { number: 49, name: 'Al-Hujurat', ayahCount: 18 },
  { number: 50, name: 'Qaf', ayahCount: 45 },
  { number: 51, name: 'Adh-Dhariyat', ayahCount: 60 },
  { number: 52, name: 'At-Tur', ayahCount: 49 },
  { number: 53, name: 'An-Najm', ayahCount: 62 },
  { number: 54, name: 'Al-Qamar', ayahCount: 55 },
  { number: 55, name: 'Ar-Rahman', ayahCount: 78 },
  { number: 56, name: "Al-Waqi'ah", ayahCount: 96 },
  { number: 57, name: 'Al-Hadid', ayahCount: 29 },
  { number: 58, name: 'Al-Mujadilah', ayahCount: 22 },
  { number: 59, name: 'Al-Hashr', ayahCount: 24 },
  { number: 60, name: 'Al-Mumtahanah', ayahCount: 13 },
  { number: 61, name: 'As-Saff', ayahCount: 14 },
  { number: 62, name: "Al-Jumu'ah", ayahCount: 11 },
  { number: 63, name: 'Al-Munafiqun', ayahCount: 11 },
  { number: 64, name: 'At-Taghabun', ayahCount: 18 },
  { number: 65, name: 'At-Talaq', ayahCount: 12 },
  { number: 66, name: 'At-Tahrim', ayahCount: 12 },
  { number: 67, name: 'Al-Mulk', ayahCount: 30 },
  { number: 68, name: 'Al-Qalam', ayahCount: 52 },
  { number: 69, name: 'Al-Haqqah', ayahCount: 52 },
  { number: 70, name: "Al-Ma'arij", ayahCount: 44 },
  { number: 71, name: 'Nuh', ayahCount: 28 },
  { number: 72, name: 'Al-Jinn', ayahCount: 28 },
  { number: 73, name: 'Al-Muzzammil', ayahCount: 20 },
  { number: 74, name: 'Al-Muddaththir', ayahCount: 56 },
  { number: 75, name: 'Al-Qiyamah', ayahCount: 40 },
  { number: 76, name: 'Al-Insan', ayahCount: 31 },
  { number: 77, name: 'Al-Mursalat', ayahCount: 50 },
  { number: 78, name: 'An-Naba', ayahCount: 40 },
  { number: 79, name: "An-Nazi'at", ayahCount: 46 },
  { number: 80, name: 'Abasa', ayahCount: 42 },
  { number: 81, name: 'At-Takwir', ayahCount: 29 },
  { number: 82, name: 'Al-Infitar', ayahCount: 19 },
  { number: 83, name: 'Al-Mutaffifin', ayahCount: 36 },
  { number: 84, name: 'Al-Inshiqaq', ayahCount: 25 },
  { number: 85, name: 'Al-Buruj', ayahCount: 22 },
  { number: 86, name: 'At-Tariq', ayahCount: 17 },
  { number: 87, name: "Al-A'la", ayahCount: 19 },
  { number: 88, name: 'Al-Ghashiyah', ayahCount: 26 },
  { number: 89, name: 'Al-Fajr', ayahCount: 30 },
  { number: 90, name: 'Al-Balad', ayahCount: 20 },
  { number: 91, name: 'Ash-Shams', ayahCount: 15 },
  { number: 92, name: 'Al-Layl', ayahCount: 21 },
  { number: 93, name: 'Ad-Duha', ayahCount: 11 },
  { number: 94, name: 'Ash-Sharh', ayahCount: 8 },
  { number: 95, name: 'At-Tin', ayahCount: 8 },
  { number: 96, name: "Al-'Alaq", ayahCount: 19 },
  { number: 97, name: 'Al-Qadr', ayahCount: 5 },
  { number: 98, name: 'Al-Bayyinah', ayahCount: 8 },
  { number: 99, name: 'Az-Zalzalah', ayahCount: 8 },
  { number: 100, name: "Al-'Adiyat", ayahCount: 11 },
  { number: 101, name: "Al-Qari'ah", ayahCount: 11 },
  { number: 102, name: 'At-Takathur', ayahCount: 8 },
  { number: 103, name: "Al-'Asr", ayahCount: 3 },
  { number: 104, name: 'Al-Humazah', ayahCount: 9 },
  { number: 105, name: 'Al-Fil', ayahCount: 5 },
  { number: 106, name: 'Quraysh', ayahCount: 4 },
  { number: 107, name: "Al-Ma'un", ayahCount: 7 },
  { number: 108, name: 'Al-Kawthar', ayahCount: 3 },
  { number: 109, name: 'Al-Kafirun', ayahCount: 6 },
  { number: 110, name: 'An-Nasr', ayahCount: 3 },
  { number: 111, name: 'Al-Masad', ayahCount: 5 },
  { number: 112, name: 'Al-Ikhlas', ayahCount: 4 },
  { number: 113, name: 'Al-Falaq', ayahCount: 5 },
  { number: 114, name: 'An-Nas', ayahCount: 6 }
];

export default function TeacherProgressPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    classId: '',
    studentId: '',
    juzzNumber: 1,
    surahNumber: 1,
    ayahFrom: '',
    ayahTo: '',
    notes: ''
  });

  const selectedStudents = useMemo(
    () => students.filter((student) => student.class && student.class.id === form.classId),
    [students, form.classId]
  );

  const selectedSurah = useMemo(
    () => surahList.find((item) => item.number === Number(form.surahNumber)),
    [form.surahNumber]
  );

  const fromAyahOptions = useMemo(() => {
    if (!selectedSurah) return [];
    return Array.from({ length: selectedSurah.ayahCount }, (_, i) => i + 1);
  }, [selectedSurah]);

  const toAyahOptions = useMemo(() => {
    if (!selectedSurah || !form.ayahFrom) return [];
    const from = Number(form.ayahFrom);
    return Array.from({ length: selectedSurah.ayahCount - from + 1 }, (_, i) => from + i);
  }, [selectedSurah, form.ayahFrom]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const [classesRes, studentsRes] = await Promise.all([
        fetch('/api/classes', { cache: 'no-store' }),
        fetch('/api/students', { cache: 'no-store' })
      ]);

      const classesJson = await classesRes.json();
      const studentsJson = await studentsRes.json();

      const classList = Array.isArray(classesJson) ? classesJson : [];
      const studentList = Array.isArray(studentsJson) ? studentsJson : [];

      setClasses(classList);
      setStudents(studentList);

      const classId = form.classId || classList[0]?.id || '';
      const studentId = form.studentId || '';

      if (!form.classId && classId) {
        setForm((prev) => ({ ...prev, classId }));
      }

      if (classId) {
        const query = new URLSearchParams({ classId, date: form.date });
        if (studentId) query.set('studentId', studentId);

        const progressRes = await fetch(`/api/progress?${query.toString()}`, { cache: 'no-store' });
        const progressJson = await progressRes.json();
        setProgress(Array.isArray(progressJson) ? progressJson : []);
      } else {
        setProgress([]);
      }
    } catch {
      setMessage('Failed to load progress data.');
    } finally {
      setLoading(false);
    }
  }, [form.classId, form.date, form.studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!form.studentId && selectedStudents[0]?.id) {
      setForm((prev) => ({ ...prev, studentId: selectedStudents[0].id }));
    }
  }, [selectedStudents, form.studentId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          classId: form.classId,
          studentId: form.studentId,
          lessonType: 'SURAH',
          juzzNumber: Number(form.juzzNumber),
          lessonNumber: Number(form.surahNumber),
          ayahFrom: form.ayahFrom ? Number(form.ayahFrom) : undefined,
          ayahTo: form.ayahTo ? Number(form.ayahTo) : undefined,
          notes: form.notes || undefined
        })
      });

      const json = await res.json();
      if (!res.ok) {
        setMessage(typeof json?.error === 'string' ? json.error : 'Unable to save progress.');
        return;
      }

      setMessage('Daily progress saved successfully.');
      await loadData();
    } catch {
      setMessage('Request failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900">Daily Progress</h2>
        <p className="mt-2 text-slate-600">Date, class, student, Juzz/Surah name, and Ayat From-To ke saath progress add karein.</p>

        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-3">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            className="h-11 rounded-xl border border-slate-300 px-3"
            required
          />

          <select
            value={form.classId}
            onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value, studentId: '' }))}
            className="h-11 rounded-xl border border-slate-300 px-3"
            required
          >
            <option value="">Select Class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name} - {item.section}</option>
            ))}
          </select>

          <select
            value={form.studentId}
            onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
            className="h-11 rounded-xl border border-slate-300 px-3"
            required
          >
            <option value="">Select Student</option>
            {selectedStudents.map((student) => (
              <option key={student.id} value={student.id}>{student.user.fullName} ({student.admissionNo})</option>
            ))}
          </select>

          <select
            value={form.juzzNumber}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                juzzNumber: Number(e.target.value)
              }))
            }
            className="h-11 rounded-xl border border-slate-300 px-3"
          >
            {juzzList.map((item) => (
              <option key={item.number} value={item.number}>
                JUZZ {item.number}: {item.name}
              </option>
            ))}
          </select>

          <select
            value={form.surahNumber}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                surahNumber: Number(e.target.value),
                ayahFrom: '',
                ayahTo: ''
              }))
            }
            className="h-11 rounded-xl border border-slate-300 px-3"
          >
            {surahList.map((item) => (
              <option key={item.number} value={item.number}>
                SURAH {item.number}: {item.name}
              </option>
            ))}
          </select>

          <input
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="h-11 rounded-xl border border-slate-300 px-3"
            placeholder="Notes (optional)"
          />

          <select
            value={form.ayahFrom}
            onChange={(e) => setForm((prev) => ({ ...prev, ayahFrom: e.target.value, ayahTo: '' }))}
            className="h-11 rounded-xl border border-slate-300 px-3"
          >
            <option value="">From Ayah</option>
            {fromAyahOptions.map((num) => (
              <option key={num} value={num}>Ayah {num}</option>
            ))}
          </select>

          <select
            value={form.ayahTo}
            onChange={(e) => setForm((prev) => ({ ...prev, ayahTo: e.target.value }))}
            className="h-11 rounded-xl border border-slate-300 px-3"
            disabled={!form.ayahFrom}
          >
            <option value="">To Ayah</option>
            {toAyahOptions.map((num) => (
              <option key={num} value={num}>Ayah {num}</option>
            ))}
          </select>

          <div className="md:col-span-3">
            <button
              disabled={saving || loading}
              className="h-11 rounded-xl bg-[#0f5954] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Daily Progress'}
            </button>
          </div>
        </form>

        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </section>

      <section className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(15,89,84,0.08)]">
        <h3 className="font-headline text-2xl font-bold text-slate-900">Progress Log</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Lesson Name</th>
                <th className="px-3 py-2 text-left">From-To Ayah</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((item) => {
                const juzzName =
                  item.juzzNumber ? juzzList.find((j) => j.number === item.juzzNumber)?.name || `Juzz ${item.juzzNumber}` : '-';
                const name = surahList.find((s) => s.number === item.lessonNumber)?.name || `Surah ${item.lessonNumber}`;

                const ayahRange =
                  item.lessonType === 'SURAH' && item.ayahFrom && item.ayahTo
                    ? `From ${item.ayahFrom} To ${item.ayahTo}`
                    : '-';

                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{item.date.slice(0, 10)}</td>
                    <td className="px-3 py-2">{item.class.name} - {item.class.section}</td>
                    <td className="px-3 py-2">{item.student.user.fullName}</td>
                    <td className="px-3 py-2">Juzz {item.juzzNumber ?? '-'} ({juzzName}) | Surah {item.lessonNumber} - {name}</td>
                    <td className="px-3 py-2">{ayahRange}</td>
                    <td className="px-3 py-2">{item.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {progress.length === 0 ? <p className="mt-4 text-sm text-slate-600">No progress records found for selected filters.</p> : null}
      </section>
    </div>
  );
}
