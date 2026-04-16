'use client';

import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle } from '@/components/ui/card';

export function EnrollmentChart({
  data
}: {
  data: { month: string; students: number }[];
}) {
  return (
    <Card className="h-80">
      <CardTitle className="mb-4">Enrollment Trend</CardTitle>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="studentFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#356dff" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#356dff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Area type="monotone" dataKey="students" stroke="#356dff" fill="url(#studentFill)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
