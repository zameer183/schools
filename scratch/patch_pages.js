const fs = require('fs');

let adminCode = fs.readFileSync('app/admin/page.tsx', 'utf8');
adminCode = `import React from 'react';\nimport { DashboardRouteLoading } from '@/components/ui/dashboard-route-loading';\n` + adminCode;

adminCode = adminCode.replace(
  /export default async function AdminDashboardPage\(\) \{[\s\S]*$/,
  `// 1. DATA FETCHING COMPONENT
async function DashboardContent() {
  const data = await getCachedAdminDashboardData();
  const { kpi, enrollmentData, attendanceSummary, invoices } = data;
  
  const toDate = (value) => (value instanceof Date ? value : new Date(value));
  const avgAttendance = attendanceSummary.length > 0
      ? Math.round(attendanceSummary.reduce((sum, item) => sum + item.value, 0) / attendanceSummary.length)
      : 0;
  const staffEngagement = Math.max(0, Math.min(100, Math.round(avgAttendance * 0.9)));
  const collected = invoices.filter((i) => i.status === 'PAID').reduce((sum, item) => sum + Number(item.amountPaid), 0);
  const activeDue = invoices.filter((i) => i.status !== 'PAID').reduce((sum, item) => sum + Number(item.amountPaid), 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Students" value={kpi.totalStudents} icon={<Users2 className="h-5 w-5" />} color="blue" />
        <KpiCard title="Active Classes" value={kpi.totalClasses} icon={<BookOpen className="h-5 w-5" />} color="emerald" />
        <KpiCard title="Total Staff" value={kpi.totalStaff} icon={<UserCog2 className="h-5 w-5" />} color="amber" />
        <KpiCard title="Total Revenue" value={formatCurrency(kpi.revenue)} icon={<Wallet className="h-5 w-5" />} color="purple" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="space-y-4">
            <h3 className="font-semibold text-[#1F2937]">Enrollment Trend</h3>
            <EnrollmentAreaChart data={enrollmentData} />
          </div>
        </Card>
      </div>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader title="Dashboard Overview" description="Monitor key performance indicators." />
      <React.Suspense fallback={<DashboardRouteLoading title="Loading Dashboard..." hint="Crunching the numbers..." />}>
        <DashboardContent />
      </React.Suspense>
    </div>
  );
}`
);

fs.writeFileSync('app/admin/page.tsx', adminCode);

let studentsCode = fs.readFileSync('app/admin/students/page.tsx', 'utf8');
if (!studentsCode.includes('StudentListContent')) {
  studentsCode = `import React from 'react';\nimport { DashboardRouteLoading } from '@/components/ui/dashboard-route-loading';\nimport { PageHeader } from '@/components/ui';\n` + studentsCode;
  studentsCode = studentsCode.replace(
    /export default async function AdminStudentsPage\(props/g,
    `async function StudentListContent(props`
  );
  studentsCode += `\n\nexport default function AdminStudentsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  return (
    <div className="w-full space-y-6">
      <PageHeader title="Student Directory" description="Manage enrolled students and fee records." />
      <React.Suspense fallback={<DashboardRouteLoading title="Loading Students..." hint="Fetching student directory from database..." />}>
        <StudentListContent searchParams={props.searchParams} />
      </React.Suspense>
    </div>
  );
}\n`;
  fs.writeFileSync('app/admin/students/page.tsx', studentsCode);
}

let attendanceCode = fs.readFileSync('app/admin/attendance/page.tsx', 'utf8');
if (!attendanceCode.includes('AttendanceContent')) {
  attendanceCode = `import React from 'react';\nimport { DashboardRouteLoading } from '@/components/ui/dashboard-route-loading';\nimport { PageHeader } from '@/components/ui';\n` + attendanceCode;
  attendanceCode = attendanceCode.replace(
    /export default async function AdminAttendancePage\(/g,
    `async function AttendanceContent(`
  );
  attendanceCode += `\n\nexport default function AdminAttendancePage(props: { searchParams?: Promise<any> }) {
  return (
    <div className="w-full space-y-6">
      <PageHeader title="Attendance Registry" description="Track daily attendance for students and staff." />
      <React.Suspense fallback={<DashboardRouteLoading title="Loading Attendance..." hint="Fetching daily records from the database..." />}>
        <AttendanceContent searchParams={props.searchParams} />
      </React.Suspense>
    </div>
  );
}\n`;
  fs.writeFileSync('app/admin/attendance/page.tsx', attendanceCode);
}
