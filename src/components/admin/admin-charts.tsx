'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

type Enrollment = { month: string; students: number };
type Attendance = { day: string; value: number };

export function EnrollmentAreaChart({ data }: { data: Enrollment[] }) {
  return (
    <div className="h-52 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 6, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f5954" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0f5954" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={24} />
          <Tooltip />
          <Area type="monotone" dataKey="students" stroke="#0f5954" strokeWidth={3} fill="url(#enrollFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AttendanceBarChartCard({ data }: { data: Attendance[] }) {
  return (
    <div className="h-52 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 6, top: 8, bottom: 0 }}>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 10 }} width={24} />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f5954" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
