import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const outRoot = path.join(process.cwd(), 'screenshots', 'full-panels');

const suites = [
  {
    role: 'admin',
    email: 'shots_admin@stitchhms.com',
    password: 'Pass@123',
    landing: '/admin',
    routes: ['/admin', '/admin/students', '/admin/teachers', '/admin/classes', '/admin/attendance', '/admin/finance', '/admin/reports', '/admin/notifications', '/admin/settings']
  },
  {
    role: 'teacher',
    email: 'shots_teacher@stitchhms.com',
    password: 'Pass@123',
    landing: '/teacher',
    routes: ['/teacher', '/teacher/students', '/teacher/progress', '/teacher/attendance', '/teacher/assignments', '/teacher/messages']
  },
  {
    role: 'student',
    email: 'shots_student@stitchhms.com',
    password: 'Pass@123',
    landing: '/student',
    routes: ['/student', '/student/schedule', '/student/assignments', '/student/results', '/student/fees']
  },
  {
    role: 'parent',
    email: 'shots_parent@stitchhms.com',
    password: 'Pass@123',
    landing: '/parent',
    routes: ['/parent', '/parent/performance', '/parent/attendance', '/parent/fees', '/parent/notifications']
  }
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function routeToName(route) {
  return route.replace(/^\//, '').replace(/\//g, '_') || 'root';
}

async function login(page, suite) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Email"]', suite.email);
  await page.fill('input[placeholder="Password"]', suite.password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL((url) => url.pathname.startsWith(suite.landing), { timeout: 30000 });
}

async function captureSuite(browser, suite) {
  const dir = path.join(outRoot, suite.role);
  await ensureDir(dir);

  const context = await browser.newContext({ viewport: { width: 1728, height: 1117 } });
  const page = await context.newPage();

  try {
    await login(page, suite);

    for (const route of suite.routes) {
      const url = `${baseUrl}${route}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const filePath = path.join(dir, `${routeToName(route)}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`[shot] ${suite.role} ${route} -> ${filePath}`);
    }
  } finally {
    await context.close();
  }
}

async function main() {
  await ensureDir(outRoot);
  const browser = await chromium.launch({ headless: true });

  try {
    for (const suite of suites) {
      await captureSuite(browser, suite);
    }
    console.log(`[done] screenshots saved at ${outRoot}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[error] screenshot capture failed:', error);
  process.exit(1);
});
