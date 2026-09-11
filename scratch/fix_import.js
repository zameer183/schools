const fs = require('fs');
let code = fs.readFileSync('app/admin/page.tsx', 'utf8');
if (!code.includes("import { DashboardRouteLoading }")) {
  code = "import { DashboardRouteLoading } from '@/components/ui/dashboard-route-loading';\n" + code;
}
fs.writeFileSync('app/admin/page.tsx', code);
