import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { MapPin, Phone, Mail, Users, BookOpen, GraduationCap, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui';

interface InstituteProfilePageProps {
  backHref: string;
  backLabel: string;
}

export async function InstituteProfilePage({ backHref, backLabel }: InstituteProfilePageProps) {
  const [studentCount, teacherCount, classCount] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
  ]);

  const stats = [
    { icon: <Users className="h-5 w-5 text-[#1F5A5C]" />, bg: 'bg-[#E0EBEC]', label: 'Total Students', value: studentCount },
    { icon: <GraduationCap className="h-5 w-5 text-[#D69E3F]" />, bg: 'bg-[#F5E6CC]', label: 'Teaching Staff', value: teacherCount },
    { icon: <BookOpen className="h-5 w-5 text-[#3B82F6]" />, bg: 'bg-[#DBEAFE]', label: 'Active Classes', value: classCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#1F5A5C] to-[#2a7579] p-8 text-white shadow-[0_8px_24px_rgba(31,90,92,0.2)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm">
          🏫
        </div>
        <h1 className="mt-4 text-2xl font-black">School Management System</h1>
        <p className="mt-1 text-sm text-white/70">Academic Institution</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <MapPin className="h-3 w-3" /> Pakistan
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Phone className="h-3 w-3" /> Contact Admin
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Mail className="h-3 w-3" /> admin@school.com
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-black text-[#1F2937]">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-[#6B7280]">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-bold text-[#1F2937]">About</h3>
        <p className="text-sm text-[#6B7280] leading-relaxed">
          This institution is committed to providing quality education. For detailed institutional
          information, contact your administrator.
        </p>
      </Card>
    </div>
  );
}
