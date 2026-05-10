import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PrintButton } from '@/components/reports/print-button';
import CsvDownloadButton from './csv-download-button';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ classId?: string; studentId?: string; from?: string; to?: string }>;
};

function parseDate(input?: string, fallback?: Date) {
  if (!input) return fallback ?? new Date();
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? fallback ?? new Date() : d;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function statusCode(status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') {
  if (status === 'PRESENT' || status === 'LATE') return 'P';
  if (status === 'ABSENT') return 'A';
  if (status === 'EXCUSED') return 'L';
  return '-';
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SURAH_NAMES: Record<number, string> = {
  1:'Al-Fatihah',2:'Al-Baqarah',3:'Ali Imran',4:'An-Nisa',5:'Al-Maidah',
  6:'Al-Anam',7:'Al-Araf',8:'Al-Anfal',9:'At-Tawbah',10:'Yunus',
  11:'Hud',12:'Yusuf',13:'Ar-Rad',14:'Ibrahim',15:'Al-Hijr',
  16:'An-Nahl',17:'Al-Isra',18:'Al-Kahf',19:'Maryam',20:'Ta-Ha',
  21:'Al-Anbiya',22:'Al-Hajj',23:'Al-Muminun',24:'An-Nur',25:'Al-Furqan',
  26:'Ash-Shuara',27:'An-Naml',28:'Al-Qasas',29:'Al-Ankabut',30:'Ar-Rum',
  31:'Luqman',32:'As-Sajdah',33:'Al-Ahzab',34:'Saba',35:'Fatir',
  36:'Ya-Sin',37:'As-Saffat',38:'Sad',39:'Az-Zumar',40:'Ghafir',
  41:'Fussilat',42:'Ash-Shura',43:'Az-Zukhruf',44:'Ad-Dukhan',45:'Al-Jathiyah',
  46:'Al-Ahqaf',47:'Muhammad',48:'Al-Fath',49:'Al-Hujurat',50:'Qaf',
  51:'Adh-Dhariyat',52:'At-Tur',53:'An-Najm',54:'Al-Qamar',55:'Ar-Rahman',
  56:'Al-Waqiah',57:'Al-Hadid',58:'Al-Mujadila',59:'Al-Hashr',60:'Al-Mumtahanah',
  61:'As-Saf',62:'Al-Jumuah',63:'Al-Munafiqun',64:'At-Taghabun',65:'At-Talaq',
  66:'At-Tahrim',67:'Al-Mulk',68:'Al-Qalam',69:'Al-Haqqah',70:'Al-Maarij',
  71:'Nuh',72:'Al-Jinn',73:'Al-Muzzammil',74:'Al-Muddaththir',75:'Al-Qiyamah',
  76:'Al-Insan',77:'Al-Mursalat',78:'An-Naba',79:'An-Naziat',80:'Abasa',
  81:'At-Takwir',82:'Al-Infitar',83:'Al-Mutaffifin',84:'Al-Inshiqaq',85:'Al-Buruj',
  86:'At-Tariq',87:'Al-Ala',88:'Al-Ghashiyah',89:'Al-Fajr',90:'Al-Balad',
  91:'Ash-Shams',92:'Al-Layl',93:'Ad-Duha',94:'Ash-Sharh',95:'At-Tin',
  96:'Al-Alaq',97:'Al-Qadr',98:'Al-Bayyinah',99:'Az-Zalzalah',100:'Al-Adiyat',
  101:'Al-Qariah',102:'At-Takathur',103:'Al-Asr',104:'Al-Humazah',105:'Al-Fil',
  106:'Quraysh',107:'Al-Maun',108:'Al-Kawthar',109:'Al-Kafirun',110:'An-Nasr',
  111:'Al-Masad',112:'Al-Ikhlas',113:'Al-Falaq',114:'An-Nas'
};

type SectionData = { range: string; kaifiyat: string; tajweed: string; hifz: string };

function parseSectionFromNotes(notes: string | null, sectionKey: string): { range: string | null; kaifiyat: string | null; tajweed: string | null; hifz: string | null } {
  const empty = { range: null, kaifiyat: null, tajweed: null, hifz: null };
  if (!notes) return empty;
  const upper = sectionKey.toUpperCase();
  const block = notes.match(new RegExp(`\\[${upper}\\]([\\s\\S]*?)(?=\\[|$)`))?.[1] ?? null;
  if (!block) return empty;
  const surahIdRaw = block.match(/SurahId:(\d+)/)?.[1];
  const surahNameRaw = block.match(/SurahName:([^\n\r]+)/)?.[1]?.trim();
  const fromAyah = block.match(/FromAyah:(\d+)/)?.[1];
  const toAyah = block.match(/ToAyah:(\d+)/)?.[1];
  const kaifiyat = block.match(/Kaifiyat:(\w+)/)?.[1] ?? null;
  const tajweed = block.match(/TajweeditTotal:(\d+)/)?.[1] ?? null;
  const hifz = block.match(/HifzTotal:(\d+)/)?.[1] ?? null;
  const range = surahIdRaw && fromAyah && toAyah
    ? `${surahNameRaw ?? SURAH_NAMES[parseInt(surahIdRaw)] ?? `Surah ${surahIdRaw}`} (${fromAyah}-${toAyah})`
    : null;
  return { range, kaifiyat, tajweed, hifz };
}

function getSectionData(
  items: { sectionKey: string; surahId: number; fromAyah: number; toAyah: number }[],
  key: string,
  notes: string | null
): SectionData {
  const selected = items.filter((item) => item.sectionKey.toLowerCase() === key);
  const fromNotes = parseSectionFromNotes(notes, key);

  let range = '-';
  if (selected.length > 0) {
    range = selected.map((item) => {
      const name = SURAH_NAMES[item.surahId] ?? `Surah ${item.surahId}`;
      return `${name} (${item.fromAyah}-${item.toAyah})`;
    }).join(', ');
  } else if (fromNotes.range) {
    range = fromNotes.range;
  }

  return {
    range,
    kaifiyat: fromNotes.kaifiyat ?? '-',
    tajweed: fromNotes.tajweed ?? '-',
    hifz: fromNotes.hifz ?? '-',
  };
}

function trimToDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseProgressSummary(notes: string | null): string {
  if (!notes) return '-';
  const overallMatch = notes.match(/OverallPerformance:(\S+)/);
  const mistakesMatch = notes.match(/TotalMistakes:(\d+)/);
  const overall = overallMatch?.[1]?.trim() ?? null;
  const mistakes = mistakesMatch?.[1]?.trim() ?? null;
  if (overall || mistakes) {
    const parts: string[] = [];
    if (overall) parts.push(`Overall: ${overall}`);
    if (mistakes) parts.push(`Mistakes: ${mistakes}`);
    return parts.join(' | ');
  }
  return '-';
}

export default async function IndividualCompleteReportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const fromDate = parseDate(params.from, monthStart);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = parseDate(params.to, now);
  toDate.setHours(23, 59, 59, 999);

  const classes = await prisma.class.findMany({
    select: { id: true, name: true, section: true },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  });

  const selectedClassId = params.classId && classes.some((c) => c.id === params.classId) ? params.classId : 'all';

  const students = await prisma.student.findMany({
    where: selectedClassId !== 'all' ? { classId: selectedClassId } : {},
    select: {
      id: true,
      classId: true,
      rollNumber: true,
      fatherName: true,
      user: { select: { fullName: true } },
      class: {
        select: {
          name: true,
          section: true,
          teacherLinks: {
            select: {
              isClassLead: true,
              teacher: { select: { user: { select: { fullName: true } } } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const selectedStudentId = students.some((s) => s.id === params.studentId) ? params.studentId ?? '' : students[0]?.id ?? '';
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const attendanceRows = selectedStudent
    ? await prisma.attendance.findMany({ where: { studentId: selectedStudent.id, date: { gte: fromDate, lte: toDate } }, select: { date: true, status: true } })
    : [];

  const progressRows = selectedStudent
    ? await prisma.studentProgress.findMany({
        where: { studentId: selectedStudent.id, date: { gte: fromDate, lte: toDate } },
        select: { date: true, surahRanges: { select: { sectionKey: true, surahId: true, fromAyah: true, toAyah: true } }, tajweeditotal: true, hifzTotal: true, notes: true },
        orderBy: { date: 'asc' }
      })
    : [];

  const resultRows = selectedStudent
    ? await prisma.result.findMany({
        where: { studentId: selectedStudent.id, exam: { examDate: { gte: fromDate, lte: toDate } } },
        select: { marksObtained: true, exam: { select: { examDate: true, title: true, totalMarks: true } }, subject: { select: { name: true } } },
        orderBy: { exam: { examDate: 'asc' } }
      })
    : [];

  const attendanceByDate = new Map<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>();
  for (const row of attendanceRows) attendanceByDate.set(dateKey(row.date), row.status);

  const progressByDate = new Map<string, (typeof progressRows)[number]>();
  for (const row of progressRows) progressByDate.set(dateKey(row.date), row);

  const examByDate = new Map<string, string[]>();
  for (const row of resultRows) {
    const key = dateKey(row.exam.examDate);
    if (!examByDate.has(key)) examByDate.set(key, []);
    examByDate.get(key)?.push(`${row.subject.name}: ${row.marksObtained}/${row.exam.totalMarks} (${row.exam.title})`);
  }

  const rows: { date: Date; attendance: string; sabq: SectionData; sabqi: SectionData; manzil: SectionData; testExam: string }[] = [];
  const emptySec: SectionData = { range: '-', kaifiyat: '-', tajweed: '-', hifz: '-' };
  const cursor = new Date(fromDate);
  const maxRows = 120;
  let rowCount = 0;

  while (cursor <= toDate && rowCount < maxRows) {
    const key = dateKey(cursor);
    const progress = progressByDate.get(key);

    rows.push({
      date: new Date(cursor),
      attendance: statusCode(attendanceByDate.get(key)),
      sabq: progress ? getSectionData(progress.surahRanges, 'sabaq', progress.notes) : emptySec,
      sabqi: progress ? getSectionData(progress.surahRanges, 'sabqi', progress.notes) : emptySec,
      manzil: progress ? getSectionData(progress.surahRanges, 'manzil', progress.notes) : emptySec,
      testExam: examByDate.get(key)?.join(' | ') || (progress ? ((progress.tajweeditotal != null || progress.hifzTotal != null) ? `T: ${progress.tajweeditotal ?? 0} | H: ${progress.hifzTotal ?? 0}` : parseProgressSummary(progress.notes)) : '-')
    });

    cursor.setDate(cursor.getDate() + 1);
    rowCount++;
  }

  const teacherName = selectedStudent?.class?.teacherLinks.find((link) => link.isClassLead)?.teacher.user.fullName ?? selectedStudent?.class?.teacherLinks[0]?.teacher.user.fullName ?? '-';

  const totalPresent = rows.filter((row) => row.attendance === 'P').length;
  const totalAbsent = rows.filter((row) => row.attendance === 'A').length;
  const totalLeave = rows.filter((row) => row.attendance === 'L').length;
  const totalHoliday = rows.reduce((sum, row) => ((row.date.getDay() === 0 || row.date.getDay() === 6) && row.attendance === '-' ? sum + 1 : sum), 0);

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6 print:hidden">
        <Link href="/admin/reports" className="text-xs font-semibold text-[#004649] hover:text-[#1b5e62]">&larr; Back to Reports</Link>
        <h1 className="mt-2 text-2xl font-bold text-[#1a1c1c]">Individual Complete Report</h1>
        <p className="mt-1 text-sm text-[#6f7979]">Date-wise complete sheet with attendance, sabq/sabqi/manzil, and test/exam notes.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <label className="text-xs font-semibold text-[#6f7979] lg:col-span-1">
            Class
            <select name="classId" defaultValue={selectedClassId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              <option value="all">All Classes</option>
              {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name} {classItem.section}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979] lg:col-span-2">
            Student
            <select name="studentId" defaultValue={selectedStudentId} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]">
              {students.map((student) => <option key={student.id} value={student.id}>{student.user.fullName}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            From
            <input type="date" name="from" defaultValue={trimToDateInput(fromDate)} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]" />
          </label>
          <label className="text-xs font-semibold text-[#6f7979]">
            To
            <input type="date" name="to" defaultValue={trimToDateInput(toDate)} className="mt-1 h-10 w-full rounded-xl bg-[#f3f4f5] px-3 text-sm text-[#1f2937]" />
          </label>
          <div className="sm:col-span-2 lg:col-span-5"><button type="submit" className="h-10 w-full rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] text-sm font-semibold text-white">Apply</button></div>
        </form>
      </div>

      {selectedStudent ? (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="mb-3 flex justify-end gap-2 print:hidden">
            <PrintButton label="Print / PDF" orientation="landscape" />
            <CsvDownloadButton
              rows={rows.map((r) => ({
                date: formatDateLabel(r.date),
                attendance: r.attendance,
                sabqRange: r.sabq.range,
                sabqKaifiyat: r.sabq.kaifiyat,
                sabqTajweed: r.sabq.tajweed,
                sabqHifz: r.sabq.hifz,
                sabqiRange: r.sabqi.range,
                sabqiKaifiyat: r.sabqi.kaifiyat,
                sabqiTajweed: r.sabqi.tajweed,
                sabqiHifz: r.sabqi.hifz,
                manzilRange: r.manzil.range,
                manzilKaifiyat: r.manzil.kaifiyat,
                manzilTajweed: r.manzil.tajweed,
                manzilHifz: r.manzil.hifz,
                testExam: r.testExam,
              }))}
              studentName={selectedStudent.user.fullName}
              className={selectedStudent.class ? `${selectedStudent.class.name} ${selectedStudent.class.section}` : 'Unassigned'}
              fromLabel={formatDateLabel(fromDate)}
              toLabel={formatDateLabel(toDate)}
            />
          </div>
          <div className="hidden print:block border-b border-[#e5e7eb] pb-2 mb-3">
            <h2 className="text-lg font-bold">Individual Complete Report</h2>
            <p className="text-xs text-[#64748b]">Date: {formatDateLabel(fromDate)} to {formatDateLabel(toDate)}</p>
          </div>
          <h2 className="text-xl font-bold text-[#1a1c1c]">Individual Complete Report</h2>
          <div className="mt-2 grid gap-1 text-sm text-[#374151] sm:grid-cols-2 lg:grid-cols-4">
            <p><span className="font-semibold">Date:</span> {formatDateLabel(fromDate)} to {formatDateLabel(toDate)}</p>
            <p><span className="font-semibold">Name:</span> {selectedStudent.user.fullName}</p>
            <p><span className="font-semibold">Class:</span> {selectedStudent.class ? `${selectedStudent.class.name} ${selectedStudent.class.section}` : 'Unassigned'}</p>
            <p><span className="font-semibold">Teacher:</span> {teacherName}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryBadge label="Total Present" value={totalPresent} tone="green" />
            <SummaryBadge label="Total Absent" value={totalAbsent} tone="red" />
            <SummaryBadge label="Total Leave" value={totalLeave} tone="gray" />
            <SummaryBadge label="Total Holiday" value={totalHoliday} tone="blue" />
          </div>

          <div className="mt-4 overflow-x-auto print:overflow-visible rounded-xl border border-[#e5e7eb]">
            <table className="min-w-[1600px] print:min-w-0 print:w-full w-full border-collapse text-xs print:text-[9px]">
              <thead>
                <tr className="bg-[#004649] text-white">
                  <th rowSpan={2} className="border-b border-r border-[#1b5e62] px-3 py-2 text-left font-semibold align-middle">Date</th>
                  <th rowSpan={2} className="border-b border-r border-[#1b5e62] px-3 py-2 text-left font-semibold align-middle">Att.</th>
                  <th colSpan={4} className="border-b border-r border-[#1b5e62] px-3 py-2 text-center font-semibold">Sabaq (New Lesson)</th>
                  <th colSpan={4} className="border-b border-r border-[#1b5e62] px-3 py-2 text-center font-semibold">Sabqi (Previous)</th>
                  <th colSpan={4} className="border-b border-r border-[#1b5e62] px-3 py-2 text-center font-semibold">Manzil (Memorised)</th>
                  <th rowSpan={2} className="border-b border-[#1b5e62] px-3 py-2 text-left font-semibold align-middle">Test / Exam</th>
                </tr>
                <tr className="bg-[#0a5558] text-white text-[11px]">
                  {['Range','Kaifiyat','T.Ghalt','H.Ghalt','Range','Kaifiyat','T.Ghalt','H.Ghalt','Range','Kaifiyat','T.Ghalt','H.Ghalt'].map((h, i) => (
                    <th key={i} className={`border-b border-r border-[#1b5e62] px-2 py-1 text-center font-medium ${i === 11 ? 'border-r-0' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date.toISOString()} className="hover:bg-[#f0fafa] even:bg-[#fafafa]">
                    <td className="border-b border-r border-[#e5e7eb] px-3 py-2 font-medium text-[#334155] whitespace-nowrap">{formatDateLabel(row.date)}</td>
                    <td className={`border-b border-r border-[#e5e7eb] px-3 py-2 text-center font-bold ${row.attendance === 'P' ? 'text-[#15803d]' : row.attendance === 'A' ? 'text-[#be123c]' : row.attendance === 'L' ? 'text-[#1d4ed8]' : 'text-[#9ca3af]'}`}>{row.attendance}</td>
                    {/* Sabaq */}
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-[#1e3a3a]">{row.sabq.range}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.sabq.kaifiyat}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.sabq.tajweed}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.sabq.hifz}</td>
                    {/* Sabqi */}
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-[#1e3a3a]">{row.sabqi.range}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.sabqi.kaifiyat}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.sabqi.tajweed}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.sabqi.hifz}</td>
                    {/* Manzil */}
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-[#1e3a3a]">{row.manzil.range}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.manzil.kaifiyat}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.manzil.tajweed}</td>
                    <td className="border-b border-r border-[#e5e7eb] px-2 py-2 text-center text-[#374151]">{row.manzil.hifz}</td>
                    {/* Test */}
                    <td className="border-b border-[#e5e7eb] px-2 py-2 text-[#334155]">{row.testExam}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[#6b7280]">Format: P = Present, A = Absent, L = Leave, - = No entry.</p>
          <div className="hidden print:flex mt-8 justify-between text-xs text-[#475569]">
            <span>Generated: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Authorized Sign: __________________</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-sm text-[#6f7979] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">No student data found.</div>
      )}
    </div>
  );
}

function SummaryBadge({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'gray' | 'blue' }) {
  const tones = {
    green: 'bg-[#ecfdf3] text-[#15803d]',
    red: 'bg-[#fff1f2] text-[#be123c]',
    gray: 'bg-[#f3f4f6] text-[#4b5563]',
    blue: 'bg-[#eff6ff] text-[#1d4ed8]'
  } as const;

  return (
    <div className={`rounded-xl px-3 py-2 ${tones[tone]}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
