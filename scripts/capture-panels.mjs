import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const outRoot = path.join(process.cwd(), 'screenshots', 'full-panels');

const suites = [
  {
    role: 'admin',
    credentials: [
      { email: 'admin@stitchhms.com', password: 'Pass@123' },
      { email: 'shots_admin@stitchhms.com', password: 'Pass@123' }
    ],
    landing: '/admin',
    routes: ['/admin', '/admin/students', '/admin/teachers', '/admin/classes', '/admin/attendance', '/admin/finance', '/admin/reports', '/admin/notifications', '/admin/settings']
  },
  {
    role: 'teacher',
    credentials: [
      { email: 'teacher@stitchhms.com', password: 'Pass@123' },
      { email: 'teacher1@stitchhms.com', password: 'Pass@123' },
      { email: 'shots_teacher@stitchhms.com', password: 'Pass@123' }
    ],
    landing: '/teacher',
    routes: ['/teacher', '/teacher/students', '/teacher/progress', '/teacher/attendance', '/teacher/assignments', '/teacher/messages']
  },
  {
    role: 'student',
    credentials: [
      { email: 'student@stitchhms.com', password: 'Pass@123' },
      { email: 'student1@stitchhms.com', password: 'Pass@123' },
      { email: 'shots_student@stitchhms.com', password: 'Pass@123' }
    ],
    landing: '/student',
    routes: ['/student', '/student/schedule', '/student/assignments', '/student/results', '/student/fees']
  },
  {
    role: 'parent',
    credentials: [
      { email: 'parent@stitchhms.com', password: 'Pass@123' },
      { email: 'shots_parent@stitchhms.com', password: 'Pass@123' }
    ],
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

  const emailLocator = page.locator('#email');
  const passwordLocator = page.locator('#password');
  const signInButton = page.locator('button:has-text("Sign In to Portal")');

  await emailLocator.waitFor({ state: 'visible', timeout: 30000 });
  await passwordLocator.waitFor({ state: 'visible', timeout: 30000 });

  let lastError = null;
  for (const account of suite.credentials) {
    try {
      await emailLocator.fill(account.email);
      await passwordLocator.fill(account.password);
      await signInButton.click();
      await page.waitForURL((url) => url.pathname.startsWith(suite.landing), { timeout: 20000 });
      return;
    } catch (error) {
      lastError = error;
      await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
      await emailLocator.waitFor({ state: 'visible', timeout: 30000 });
      await passwordLocator.waitFor({ state: 'visible', timeout: 30000 });
    }
  }

  throw new Error(`Login failed for role "${suite.role}". Last error: ${String(lastError)}`);
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
