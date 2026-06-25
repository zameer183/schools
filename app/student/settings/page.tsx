import { UserRole } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card } from '@/components/ui';
import { User, Mail, Phone, BookOpen, Hash, GraduationCap, Shield, WifiOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

function isDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('Connection terminated unexpectedly'))
  );
}

function DbOfflineBanner() {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fef2f2]">
          <WifiOff className="h-7 w-7 text-[#ef4444]" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#1F2937]">Database Unreachable</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Unable to load profile details right now. Please refresh once the connection recovers.</p>
      </div>
    </Card>
  );
}

const getCachedStudentSettingsData = unstable_cache(
  async (userId: string) =>
    prisma.student.findUnique({
      where: { userId },
      select: {
        admissionNo: true,
        user: { select: { fullName: true, email: true, phone: true } },
        class: { select: { name: true, section: true } }
      }
    }),
  ['student-settings-page-data'],
  { revalidate: 30 }
);

export default async function StudentSettingsPage() {
  const session = await requireAuth([UserRole.STUDENT, UserRole.ADMIN]);
  let student: Awaited<ReturnType<typeof getCachedStudentSettingsData>> | null = null;
  let databaseUnavailable = false;
  try {
    student = await getCachedStudentSettingsData(session.id);
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    databaseUnavailable = true;
  }

  if (databaseUnavailable) {
    return <DbOfflineBanner />;
  }

  if (!student) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1F2937]">Profile Missing</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Student profile not found. Contact your administrator.</p>
      </Card>
    );
  }

  const name = student?.user.fullName ?? 'Student';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  const profileFields = [
    { icon: <User className="h-4 w-4 text-[#10B981]" />, bg: 'bg-[#D1FAE5]', label: 'Full Name', value: student?.user.fullName ?? '-' },
    { icon: <Mail className="h-4 w-4 text-[#3B82F6]" />, bg: 'bg-[#DBEAFE]', label: 'Email', value: student?.user.email ?? '-', mono: true },
    { icon: <Phone className="h-4 w-4 text-[#D69E3F]" />, bg: 'bg-[#F5E6CC]', label: 'Phone', value: student?.user.phone ?? 'Not provided' },
  ];

  const academicFields = [
    { icon: <BookOpen className="h-4 w-4 text-[#1F5A5C]" />, bg: 'bg-[#E0EBEC]', label: 'Class', value: student?.class ? `${student.class.name} — ${student.class.section}` : 'Not assigned' },
    { icon: <Hash className="h-4 w-4 text-[#7C3AED]" />, bg: 'bg-[#EDE9FE]', label: 'Admission No.', value: student?.admissionNo ?? '-' },
    { icon: <Shield className="h-4 w-4 text-[#10B981]" />, bg: 'bg-[#D1FAE5]', label: 'Role', value: 'Student' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Profile & Settings" subtitle="Your account information and academic details." />

      {/* Avatar hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1F5A5C] to-[#2a7579] p-6 text-white shadow-[0_8px_24px_rgba(31,90,92,0.18)]">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm">
            {initials}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl font-bold leading-tight">{name}</p>
            {student?.class && (
              <p className="mt-1 text-sm text-white/80">
                {student.class.name} — {student.class.section}
              </p>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <GraduationCap className="h-3.5 w-3.5" />
                Student
              </span>
              {student?.admissionNo && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <Hash className="h-3.5 w-3.5" />
                  {student.admissionNo}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5]">
              <User className="h-4 w-4 text-[#10B981]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Contact Info</h3>
          </div>
          <div className="space-y-3">
            {profileFields.map((field) => (
              <div key={field.label} className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${field.bg}`}>
                  {field.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{field.label}</p>
                  <p className={`text-sm font-semibold text-[#1F2937] mt-0.5 ${field.mono ? 'break-all' : 'truncate'}`}>{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0EBEC]">
              <BookOpen className="h-4 w-4 text-[#1F5A5C]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F2937]">Academic Info</h3>
          </div>
          <div className="space-y-3">
            {academicFields.map((field) => (
              <div key={field.label} className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] px-4 py-3 border border-[#E5E7EB]">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${field.bg}`}>
                  {field.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{field.label}</p>
                  <p className="text-sm font-semibold text-[#1F2937] mt-0.5">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
