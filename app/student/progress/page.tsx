import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchParams = {
  from?: string;
  to?: string;
};

// ─── Surah map ───────────────────────────────────────────────────────────────
const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
  6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Rad', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqiah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saf', 62: 'Al-Jumuah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
};

// ─── Notes parser ─────────────────────────────────────────────────────────────
type SectionResult = {
  range: string;
  kaifiyat: string;
  tajweed: string;
  hifz: string;
};

function parseSectionFromNotes(notes: string | null, sectionKey: string): SectionResult {
  const dash = { range: '-', kaifiyat: '-', tajweed: '-', hifz: '-' };
  if (!notes) return dash;

  const upper = sectionKey.toUpperCase();
  const block = notes.match(new RegExp(`\\[${upper}\\]([\\s\\S]*?)(?=\\[|$)`))?.[1] ?? null;
  if (!block) return dash;

  const ranges = block
    .split(/Range:\d+/)
    .slice(1)
    .map((rangeBlock) => {
      const surahIdRaw = rangeBlock.match(/SurahId:(\d+)/)?.[1];
      const surahNameRaw = rangeBlock.match(/SurahName:([^\n\r]+)/)?.[1]?.trim();
      const fromAyah = rangeBlock.match(/FromAyah:(\d+)/)?.[1];
      const toAyah = rangeBlock.match(/ToAyah:(\d+)/)?.[1];
      if (!fromAyah || !toAyah) return null;
      const surahName =
        surahNameRaw && surahNameRaw !== '-'
          ? surahNameRaw
          : surahIdRaw
            ? SURAH_NAMES[parseInt(surahIdRaw)] ?? `Surah ${surahIdRaw}`
            : null;
      return surahName ? `${surahName} (${fromAyah}-${toAyah})` : null;
    })
    .filter((value): value is string => Boolean(value));

  const surahIdRaw = block.match(/SurahId:(\d+)/)?.[1];
  const surahNameRaw = block.match(/SurahName:([^\n\r]+)/)?.[1]?.trim();
  const fromAyah = block.match(/FromAyah:(\d+)/)?.[1];
  const toAyah = block.match(/ToAyah:(\d+)/)?.[1];
  const kaifiyat = block.match(/Kaifiyat:([^\n\r]+)/)?.[1]?.trim() ?? '-';
  const tajweed =
    block.match(/TajweediGhalat:(\d+)/)?.[1] ??
    block.match(/TajweeditTotal:(\d+)/)?.[1] ??
    '-';
  const hifz =
    block.match(/HifzGhalat:(\d+)/)?.[1] ??
    block.match(/HifzTotal:(\d+)/)?.[1] ??
    '-';

  const range = ranges.length
    ? ranges.join(', ')
    : surahIdRaw && fromAyah && toAyah
      ? `${surahNameRaw ?? SURAH_NAMES[parseInt(surahIdRaw)] ?? `Surah ${surahIdRaw}`} (${fromAyah}-${toAyah})`
      : surahNameRaw && fromAyah && toAyah
        ? `${surahNameRaw} (${fromAyah}-${toAyah})`
        : '-';

  return { range, kaifiyat, tajweed, hifz };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSectionFromRanges(
  surahRanges: { sectionKey: string; surahId: number; fromAyah: number; toAyah: number }[],
  key: string,
  notes: string | null
): SectionResult {
  const filtered = surahRanges.filter((r) => r.sectionKey.toLowerCase() === key.toLowerCase());
  if (filtered.length > 0) {
    const range = filtered
      .map((r) => `${SURAH_NAMES[r.surahId] ?? `Surah ${r.surahId}`} (${r.fromAyah}-${r.toAyah})`)
      .join(', ');
    const fromNotes = parseSectionFromNotes(notes, key);
    return {
      range,
      kaifiyat: fromNotes.kaifiyat,
      tajweed: fromNotes.tajweed,
      hifz: fromNotes.hifz,
    };
  }
  return parseSectionFromNotes(notes, key);
}

function isAllDash(s: SectionResult) {
  return s.range === '-' && s.kaifiyat === '-' && s.tajweed === '-' && s.hifz === '-';
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

type AttStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

function attendanceBadge(status?: AttStatus | null) {
  if (!status)
    return <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-semibold text-[#94a3b8]">-</span>;
  const map: Record<AttStatus, string> = {
    PRESENT: 'bg-[#dcfce7] text-[#15803d]',
    ABSENT: 'bg-[#fee2e2] text-[#b91c1c]',
    LATE: 'bg-[#fff7ed] text-[#b45309]',
    EXCUSED: 'bg-[#eff6ff] text-[#1d4ed8]',
  };
  const label: Record<AttStatus, string> = {
    PRESENT: 'P  Present',
    ABSENT: 'A  Absent',
    LATE: 'L  Late',
    EXCUSED: 'E  Excused',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function StudentProgressPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  const params = (await searchParams) ?? {};

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 86_400_000);
  defaultFrom.setHours(0, 0, 0, 0);

  const fromDate = params.from ? (() => { const d = new Date(params.from); d.setHours(0, 0, 0, 0); return isNaN(d.getTime()) ? defaultFrom : d; })() : defaultFrom;
  const toDate = params.to ? (() => { const d = new Date(params.to); d.setHours(23, 59, 59, 999); return isNaN(d.getTime()) ? now : d; })() : (() => { const d = new Date(now); d.setHours(23, 59, 59, 999); return d; })();

  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    select: {
      id: true,
      user: { select: { fullName: true } },
      class: { select: { name: true, section: true } },
    },
  });

  if (!student) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center max-w-sm w-full">
          <p className="text-lg font-bold text-[#1a1c1c]">No student profile found</p>
          <p className="mt-2 text-sm text-[#6b7280]">Contact your administrator.</p>
        </div>
      </div>
    );
  }

  const [progressRows, attendanceRows] = await Promise.all([
    prisma.studentProgress.findMany({
      where: { studentId: student.id, date: { gte: fromDate, lte: toDate } },
      select: {
        id: true,
        date: true,
        notes: true,
        surahRanges: { select: { sectionKey: true, surahId: true, fromAyah: true, toAyah: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.attendance.findMany({
      where: { studentId: student.id, date: { gte: fromDate, lte: toDate } },
      select: { date: true, status: true },
    }),
  ]);

  // Build attendance map keyed by date string
  const attMap = new Map<string, AttStatus>();
  for (const a of attendanceRows) {
    attMap.set(a.date.toISOString().slice(0, 10), a.status as AttStatus);
  }

  const className = student.class
    ? `${student.class.name} ${student.class.section}`
    : 'Unassigned';

  const totalPresent = progressRows.filter((r) => {
    const s = attMap.get(r.date.toISOString().slice(0, 10));
    return s === 'PRESENT' || s === 'LATE';
  }).length;

  return (
    <div className="pb-28 px-4 pt-4 max-w-lg mx-auto space-y-4">
      {/* Header card */}
      <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] p-4">
        <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Daily Progress</p>
        <p className="mt-1 text-xl font-bold text-[#1a1c1c]">{student.user.fullName}</p>
        <p className="text-sm text-[#6b7280]">{className}</p>

        {/* Date filter form */}
        <form method="get" className="mt-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={toDateInputValue(fromDate)}
              className="h-10 w-full rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] px-3 text-sm text-[#1a1c1c] outline-none focus:ring-2 focus:ring-[#004649]/20"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={toDateInputValue(toDate)}
              className="h-10 w-full rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] px-3 text-sm text-[#1a1c1c] outline-none focus:ring-2 focus:ring-[#004649]/20"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-xl bg-gradient-to-br from-[#004649] to-[#1b5e62] px-5 text-sm font-semibold text-white shrink-0"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0fdf4]">
            <span className="text-lg font-black text-[#15803d]">{progressRows.length}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b7280]">Total entries</p>
            <p className="text-xs text-[#94a3b8]">in this period</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7]">
            <span className="text-lg font-black text-[#15803d]">{totalPresent}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6b7280]">Present days</p>
            <p className="text-xs text-[#94a3b8]">marked in records</p>
          </div>
        </div>
      </div>

      {/* Progress feed */}
      {progressRows.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-10 flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f5f9]">
            <span className="text-2xl">📖</span>
          </div>
          <p className="mt-4 text-base font-bold text-[#1a1c1c]">No progress records</p>
          <p className="mt-1 text-sm text-[#6b7280]">No entries found for this period.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {progressRows.map((row) => {
            const sabaq = getSectionFromRanges(row.surahRanges, 'sabaq', row.notes);
            const sabqi = getSectionFromRanges(row.surahRanges, 'sabqi', row.notes);
            const manzil = getSectionFromRanges(row.surahRanges, 'manzil', row.notes);
            const attStatus = attMap.get(row.date.toISOString().slice(0, 10));

            return (
              <div
                key={row.id}
                className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden"
              >
                {/* Date header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9]">
                  <p className="text-sm font-bold text-[#1a1c1c]">{formatDate(row.date)}</p>
                  {attendanceBadge(attStatus)}
                </div>

                {/* Section rows */}
                <SectionRow
                  label="SABAQ"
                  sublabel="New Lesson"
                  accentBorder="border-l-4 border-[#22c55e]"
                  bg="bg-[#f0fdf4]"
                  labelColor="text-[#15803d]"
                  data={sabaq}
                />
                <SectionRow
                  label="SABQI"
                  sublabel="Previous"
                  accentBorder="border-l-4 border-[#f59e0b]"
                  bg="bg-[#fffbeb]"
                  labelColor="text-[#b45309]"
                  data={sabqi}
                />
                <SectionRow
                  label="MANZIL"
                  sublabel="Memorised"
                  accentBorder="border-l-4 border-[#0891b2]"
                  bg="bg-[#f0f9ff]"
                  labelColor="text-[#0e7490]"
                  data={manzil}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section row component ────────────────────────────────────────────────────
function SectionRow({
  label,
  sublabel,
  accentBorder,
  bg,
  labelColor,
  data,
}: {
  label: string;
  sublabel: string;
  accentBorder: string;
  bg: string;
  labelColor: string;
  data: SectionResult;
}) {
  const empty = isAllDash(data);

  return (
    <div className={`${accentBorder} ${bg} px-4 py-3 border-b border-[#f1f5f9] last:border-b-0`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>
          {label}
        </span>
        <span className="text-[10px] text-[#94a3b8]">{sublabel}</span>
      </div>

      {empty ? (
        <p className="text-xs text-[#94a3b8] italic">No data recorded</p>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#1a1c1c]">{data.range}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <p className="text-xs text-[#6b7280]">
              <span className="font-medium text-[#374151]">Performance:</span> {data.kaifiyat}
            </p>
            <p className="text-xs text-[#6b7280]">
              <span className="font-medium text-[#374151]">T.Ghalt:</span> {data.tajweed}
            </p>
            <p className="text-xs text-[#6b7280]">
              <span className="font-medium text-[#374151]">H.Ghalt:</span> {data.hifz}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
