import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserSquare2
} from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeacherAccessLevelsByUserId } from '@/lib/teacher-access';
import { Card, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

type TeacherStudentDetail = {
  id: string;
  admissionNo: string;
  dateOfBirth: string | Date | null;
  joinDate: string | Date | null;
  currentAddress: string | null;
  emergencyContact: string | null;
  guardianPhone: string | null;
  fatherName: string | null;
  gender: string | null;
  whatsApp: string | null;
  schoolName: string | null;
  classId: string | null;
  user: { fullName: string; email: string; phone: string | null; isActive: boolean };
  class: { id: string; name: string; section: string } | null;
  attendance: Array<{ status: string }>;
};

async function getTeacherScope(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, classAssignments: { select: { classId: true } } }
  });
  if (!teacher) return null;
  return { id: teacher.id, classIds: teacher.classAssignments.map((x) => x.classId) };
}

function isLocalRestFallbackEnabled() {
  return process.env.FORCE_SUPABASE_REST_DATA_FALLBACK === '1';
}

async function supabaseRest<T>(table: string, params: Record<string, string>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${table} failed with ${response.status}`);
  }

  return (await response.json()) as T[];
}

async function getTeacherScopeViaRest(userId: string) {
  const [teacher] = await supabaseRest<{ id: string }>('Teacher', {
    select: 'id',
    userId: `eq.${userId}`,
    limit: '1'
  });
  if (!teacher) return null;
  const classLinks = await supabaseRest<{ classId: string }>('TeacherClass', {
    select: 'classId',
    teacherId: `eq.${teacher.id}`
  });
  return { id: teacher.id, classIds: classLinks.map((item) => item.classId) };
}

async function getStudentDetailViaRest(studentId: string): Promise<TeacherStudentDetail | null> {
  const [student] = await supabaseRest<{
    id: string;
    userId: string;
    admissionNo: string;
    dateOfBirth: string | null;
    joinDate: string | null;
    currentAddress: string | null;
    emergencyContact: string | null;
    guardianPhone: string | null;
    fatherName: string | null;
    gender: string | null;
    whatsApp: string | null;
    schoolName: string | null;
    classId: string | null;
  }>('Student', {
    select: 'id,userId,admissionNo,dateOfBirth,joinDate,currentAddress,emergencyContact,guardianPhone,fatherName,gender,whatsApp,schoolName,classId',
    id: `eq.${studentId}`,
    limit: '1'
  });
  if (!student) return null;

  const [userRows, classRows, attendanceRows] = await Promise.all([
    supabaseRest<{ fullName: string; email: string; phone: string | null; isActive: boolean }>('User', {
      select: 'fullName,email,phone,isActive',
      id: `eq.${student.userId}`,
      limit: '1'
    }),
    student.classId
      ? supabaseRest<{ id: string; name: string; section: string }>('Class', {
          select: 'id,name,section',
          id: `eq.${student.classId}`,
          limit: '1'
        })
      : Promise.resolve([]),
    supabaseRest<{ status: string }>('Attendance', {
      select: 'status',
      studentId: `eq.${student.id}`,
      limit: '1000'
    })
  ]);

  return {
    ...student,
    user: userRows[0] ?? { fullName: 'Unknown Student', email: '', phone: null, isActive: false },
    class: classRows[0] ?? null,
    attendance: attendanceRows
  };
}

export default async function TeacherStudentDetailsPage({ params }: Props) {
  const session = await requireAuth([UserRole.TEACHER, UserRole.ADMIN]);
  const { id } = await params;

  if (session.role === UserRole.TEACHER && !isLocalRestFallbackEnabled()) {
    const access = await getTeacherAccessLevelsByUserId(session.id);
    if (access.STUDENTS === 'NONE') notFound();
  }

  const student: TeacherStudentDetail | null = isLocalRestFallbackEnabled()
    ? await getStudentDetailViaRest(id)
    : await prisma.student.findUnique({
        where: { id },
        select: {
          id: true,
          admissionNo: true,
          dateOfBirth: true,
          joinDate: true,
          currentAddress: true,
          emergencyContact: true,
          guardianPhone: true,
          fatherName: true,
          gender: true,
          whatsApp: true,
          schoolName: true,
          classId: true,
          user: { select: { fullName: true, email: true, phone: true, isActive: true } },
          class: { select: { id: true, name: true, section: true } },
          attendance: { select: { status: true } }
        }
      });

  if (!student) notFound();

  if (session.role === UserRole.TEACHER) {
    if (isLocalRestFallbackEnabled()) {
      const scope = await getTeacherScopeViaRest(session.id);
      if (!scope || (student.classId && !scope.classIds.includes(student.classId))) notFound();
    } else {
      const access = await getTeacherAccessLevelsByUserId(session.id);
      if (access.STUDENTS !== 'FULL') {
        const scope = await getTeacherScope(session.id);
        if (!scope || (student.classId && !scope.classIds.includes(student.classId))) notFound();
      }
    }
  }

  const attendanceLogs = student.attendance ?? [];
  const attendancePercent = attendanceLogs.length
    ? Math.round((attendanceLogs.filter((a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EXCUSED').length / attendanceLogs.length) * 100)
    : 0;

  return (
    <div className="space-y-4 bg-[#F4F7F8] pb-28">
      <div className="sticky top-2 z-20 rounded-[22px] border border-white/80 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,118,110,0.12)] backdrop-blur-md">
        <PageHeader title="Student Details" subtitle="Teacher view of student profile." />
      </div>

      <Card className="overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(160deg,#ffffff_0%,#f2fcfa_100%)] p-4 shadow-[0_16px_34px_rgba(15,118,110,0.14)]">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#084750] text-xl font-bold text-white shadow-[0_10px_20px_rgba(8,71,80,0.35)]">
            {student.user.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-xl font-extrabold tracking-tight text-[#0F172A]">{student.user.fullName}</p>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${student.user.isActive ? 'bg-[#D1FAE5] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                {student.user.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="truncate text-sm text-[#64748B]">{student.user.email}</p>
            <p className="text-xs font-medium text-[#64748B]">Admission #{student.admissionNo}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#D7E3E8] bg-white p-3">
            <p className="text-[11px] font-medium text-[#64748B]">Class</p>
            <p className="mt-1 text-sm font-semibold text-[#0F172A]">{student.class ? `${student.class.name} - ${student.class.section}` : '-'}</p>
          </div>
          <div className="rounded-2xl border border-[#D7E3E8] bg-white p-3">
            <p className="text-[11px] font-medium text-[#64748B]">Attendance</p>
            <p className="mt-1 text-sm font-semibold text-[#0F172A]">{attendancePercent}%</p>
          </div>
        </div>
      </Card>

      <Card className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_12px_26px_rgba(15,118,110,0.08)]">
        <p className="mb-3 text-base font-bold text-[#0F172A]">Student Details</p>
        <div className="space-y-2.5">
          {[
            { label: 'Email', value: student.user.email || '-', icon: Mail },
            { label: 'Phone', value: student.user.phone || '-', icon: Phone },
            { label: 'WhatsApp', value: student.whatsApp || '-', icon: Phone },
            { label: 'Date of Birth', value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-', icon: CalendarCheck2 },
            { label: 'Gender', value: student.gender || '-', icon: UserSquare2 },
            { label: "Father's Name", value: student.fatherName || '-', icon: UserSquare2 },
            { label: 'Join Date', value: student.joinDate ? new Date(student.joinDate).toLocaleDateString() : '-', icon: CheckCircle2 },
            { label: 'Current Address', value: student.currentAddress || '-', icon: MapPin },
            { label: 'Emergency Contact', value: student.emergencyContact || '-', icon: BellRing },
            { label: 'Guardian Phone', value: student.guardianPhone || '-', icon: Phone },
            { label: 'School', value: student.schoolName || '-', icon: GraduationCap }
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FBFC] p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F4F1] text-[#0F766E]">
                <row.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">{row.label}</p>
                <p className="truncate text-sm font-medium text-[#0F172A]">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[24px] border border-white/80 bg-white p-4 shadow-[0_12px_26px_rgba(15,118,110,0.08)]">
        <p className="mb-3 text-base font-bold text-[#0F172A]">Quick Access</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href={`/teacher/students/${student.id}/attendance`} className="group flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#084750] text-xs font-semibold text-white shadow-[0_10px_18px_rgba(8,71,80,0.3)] transition active:scale-[0.98]">
            <CalendarCheck2 className="h-4 w-4" />
            Attendance
          </Link>
          <Link href={`/teacher/students/${student.id}/progress`} className="group flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#D7E3E8] bg-[#F8FBFC] text-xs font-semibold text-[#0F172A] transition active:scale-[0.98]">
            <BarChart3 className="h-4 w-4 text-[#0F766E]" />
            Progress
          </Link>
          <Link href={`/teacher/messages?studentId=${student.id}`} className="group flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#D7E3E8] bg-[#F8FBFC] text-xs font-semibold text-[#0F172A] transition active:scale-[0.98]">
            <Mail className="h-4 w-4 text-[#0F766E]" />
            Message
          </Link>
          <Link href="/teacher/students" className="group flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#D7E3E8] bg-[#F8FBFC] text-xs font-semibold text-[#0F172A] transition active:scale-[0.98]">
            <ArrowLeft className="h-4 w-4 text-[#0F766E]" />
            Students
          </Link>
        </div>
      </Card>
    </div>
  );
}
