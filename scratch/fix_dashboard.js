const fs = require('fs');
let code = fs.readFileSync('app/admin/page.tsx', 'utf8');

// 1. Remove force-dynamic
code = code.replace(/export const dynamic = 'force-dynamic';\r?\n?/, '');

// 2. Change revalidate to 3600
code = code.replace(/revalidate:\s*\d+/g, 'revalidate: 3600');

// 3. Rename AdminDashboardPage to DashboardContent
code = code.replace(/export default async function AdminDashboardPage\(\)/g, 'async function DashboardContent()');

// 4. Append new AdminDashboardPage wrapper
code += `\n\nexport default function AdminDashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <React.Suspense fallback={<DashboardRouteLoading title="Loading Dashboard..." hint="Crunching the numbers..." />}>
        <DashboardContent />
      </React.Suspense>
    </div>
  );
}\n`;

fs.writeFileSync('app/admin/page.tsx', code);
