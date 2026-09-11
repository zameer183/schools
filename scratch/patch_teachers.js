const fs = require('fs');
const file = 'app/admin/teachers/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove force-dynamic
content = content.replace(/export const dynamic = 'force-dynamic';\r?\n?/, '');

// 2. We need to add Suspense and move AdminTeachersPage to TeachersContent
if (!content.includes('TeachersContent')) {
  content = `import React from 'react';\nimport { DashboardRouteLoading } from '@/components/ui/dashboard-route-loading';\nimport { PageHeader } from '@/components/ui';\n` + content;
  content = content.replace(
    /export default async function AdminTeachersPage\(props/g,
    `async function TeachersContent(props`
  );
  content += `\n\nexport default function AdminTeachersPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  return (
    <div className="w-full space-y-6">
      <PageHeader title="Staff Directory" description="Manage teachers and access levels." />
      <React.Suspense fallback={<DashboardRouteLoading title="Loading Staff..." hint="Fetching directory..." />}>
        <TeachersContent searchParams={props.searchParams} />
      </React.Suspense>
    </div>
  );
}\n`;
}

fs.writeFileSync(file, content);
