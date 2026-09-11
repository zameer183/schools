const fs = require('fs');

['app/admin/students/page.tsx', 'app/admin/attendance/page.tsx', 'app/admin/page.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/export const dynamic = 'force-dynamic';\r?\n?/, '');
  fs.writeFileSync(file, content);
});

// For admin page, it already has unstable_cache(..., {revalidate: 300})
let adminPage = fs.readFileSync('app/admin/page.tsx', 'utf8');
adminPage = adminPage.replace(/revalidate: 300/g, 'revalidate: 3600');
fs.writeFileSync('app/admin/page.tsx', adminPage);

// For attendance page, it already has unstable_cache(..., {revalidate: 60})
let attendancePage = fs.readFileSync('app/admin/attendance/page.tsx', 'utf8');
attendancePage = attendancePage.replace(/revalidate: 60/g, 'revalidate: 3600');
fs.writeFileSync('app/admin/attendance/page.tsx', attendancePage);

// For students page, it doesn't have unstable_cache, so we add route segment config
let studentsPage = fs.readFileSync('app/admin/students/page.tsx', 'utf8');
if (!studentsPage.includes('export const revalidate = 3600;')) {
  studentsPage = studentsPage.replace(
    /(import .*?;?\n)/,
    `$1export const revalidate = 3600;\n`
  );
  fs.writeFileSync('app/admin/students/page.tsx', studentsPage);
}

// For teachers page, add revalidate
let teachersPage = fs.readFileSync('app/admin/teachers/page.tsx', 'utf8');
if (!teachersPage.includes('export const revalidate = 3600;')) {
  teachersPage = teachersPage.replace(
    /(import .*?;?\n)/,
    `$1export const revalidate = 3600;\n`
  );
  fs.writeFileSync('app/admin/teachers/page.tsx', teachersPage);
}

