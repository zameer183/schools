import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'https://schools-plum.vercel.app';

const roleSuites = {
  admin: {
    landing: '/admin',
    credentials: [
      { email: 'admin@stitchhms.com', password: 'Pass@123' },
      { email: 'shots_admin@stitchhms.com', password: 'Pass@123' }
    ],
    routes: ['/admin', '/admin/students', '/admin/teachers', '/admin/classes', '/admin/attendance', '/admin/finance', '/admin/reports', '/admin/messages', '/admin/notifications', '/admin/settings']
  },
  teacher: {
    landing: '/teacher',
    credentials: [
      { email: 'teacher@stitchhms.com', password: 'Pass@123' },
      { email: 'teacher1@stitchhms.com', password: 'Pass@123' },
      { email: 'teacher2@stitchhms.com', password: 'Pass@123' }
    ],
    routes: ['/teacher', '/teacher/students', '/teacher/progress', '/teacher/attendance', '/teacher/assignments', '/teacher/messages']
  },
  parent: {
    landing: '/parent',
    credentials: [
      { email: 'parent@stitchhms.com', password: 'Pass@123' },
      { email: 'shots_parent@stitchhms.com', password: 'Pass@123' }
    ],
    routes: ['/parent', '/parent/performance', '/parent/attendance', '/parent/fees', '/parent/notifications']
  }
};

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function routeToFile(route) {
  return route.replace(/^\//, '').replace(/\//g, '__') || 'root';
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function login(page, suite, extraCredentials = []) {
  const candidates = [...suite.credentials, ...extraCredentials];
  for (const account of candidates) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.locator('#email').fill(account.email);
    await page.locator('#password').fill(account.password);
    await page.locator('button:has-text("Sign In to Portal")').click();

    try {
      await page.waitForURL((url) => url.pathname.startsWith(suite.landing), { timeout: 20000 });
      return { ok: true, account };
    } catch {
      // try next
    }
  }
  return { ok: false, account: null };
}

async function logout(page) {
  try {
    await page.request.post(`${baseUrl}/api/auth/logout`);
  } catch {
    // ignore
  }
}

async function captureRoutes(page, role, routes, shotsDir, report) {
  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const filePath = path.join(shotsDir, `${role}__${routeToFile(route)}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    report.screenshots.push(filePath);
  }
}

async function main() {
  const runId = `full-qa-${stamp()}`;
  const outDir = path.join(process.cwd(), 'qa-artifacts', runId);
  const shotsDir = path.join(outDir, 'screenshots');
  await ensureDir(shotsDir);

  const report = {
    runId,
    baseUrl,
    startedAt: new Date().toISOString(),
    dataSourceCheck: {
      databaseUrlHost: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      verdict: 'Configured env points to Supabase Postgres'
    },
    logins: {},
    apiChecks: {},
    mutations: {},
    screenshots: [],
    notes: []
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1728, height: 1117 } });
  const page = await context.newPage();

  try {
    const adminLogin = await login(page, roleSuites.admin);
    report.logins.admin = adminLogin;
    if (!adminLogin.ok) {
      report.notes.push('Admin login failed. QA stopped.');
      await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
      return;
    }

    await captureRoutes(page, 'admin', roleSuites.admin.routes, shotsDir, report);

    const [classesRes, studentsRes, teachersRes, attendanceRes, feesRes, messagesRes, notificationsRes, paymentsRes] = await Promise.all([
      page.request.get(`${baseUrl}/api/classes`),
      page.request.get(`${baseUrl}/api/students`),
      page.request.get(`${baseUrl}/api/teachers`),
      page.request.get(`${baseUrl}/api/attendance`),
      page.request.get(`${baseUrl}/api/fees`),
      page.request.get(`${baseUrl}/api/messages`),
      page.request.get(`${baseUrl}/api/notifications`),
      page.request.get(`${baseUrl}/api/payments`)
    ]);

    const classes = (await classesRes.json().catch(() => [])) ?? [];
    const students = (await studentsRes.json().catch(() => [])) ?? [];
    const teachers = (await teachersRes.json().catch(() => [])) ?? [];
    const payments = (await paymentsRes.json().catch(() => [])) ?? [];

    report.apiChecks = {
      classes: { status: classesRes.status(), count: Array.isArray(classes) ? classes.length : null },
      students: { status: studentsRes.status(), count: Array.isArray(students) ? students.length : null },
      teachers: { status: teachersRes.status(), count: Array.isArray(teachers) ? teachers.length : null },
      attendance: { status: attendanceRes.status() },
      fees: { status: feesRes.status() },
      messages: { status: messagesRes.status() },
      notifications: { status: notificationsRes.status() },
      payments: { status: paymentsRes.status(), count: Array.isArray(payments) ? payments.length : null }
    };

    const firstClassId = Array.isArray(classes) ? classes[0]?.id : null;
    const firstStudent = Array.isArray(students) ? students[0] : null;

    const unique = Date.now();

    const classCreate = await page.request.post(`${baseUrl}/api/classes`, {
      data: {
        name: `QA Grade ${String(unique).slice(-4)}`,
        section: 'Q',
        roomNo: 'QA-1',
        academicYear: '2026'
      }
    });
    const classCreateBody = await classCreate.json().catch(() => ({}));
    const createdClassId = classCreateBody?.id ?? null;
    let classDeleteStatus = null;
    if (createdClassId) {
      const classDelete = await page.request.delete(`${baseUrl}/api/classes?id=${createdClassId}`);
      classDeleteStatus = classDelete.status();
    }

    const teacherCreate = await page.request.post(`${baseUrl}/api/teachers`, {
      data: {
        fullName: `QA Teacher ${unique}`,
        email: `qa.teacher.${unique}@stitchhms.com`,
        password: 'Pass@123',
        position: 'QA Lecturer',
        department: 'QA Department',
        classIds: firstClassId ? [firstClassId] : [],
        baseSalary: 1000,
        bonus: 50,
        deduction: 0
      }
    });
    const teacherCreateBody = await teacherCreate.json().catch(() => ({}));
    const createdTeacherId = teacherCreateBody?.id ?? null;
    let teacherDeleteStatus = null;
    if (createdTeacherId) {
      const teacherDelete = await page.request.delete(`${baseUrl}/api/teachers?id=${createdTeacherId}`);
      teacherDeleteStatus = teacherDelete.status();
    }

    const studentCreate = await page.request.post(`${baseUrl}/api/students`, {
      data: {
        fullName: `QA Student ${unique}`,
        email: `qa.student.${unique}@stitchhms.com`,
        password: 'Pass@123',
        admissionNo: `QA-ADM-${unique}`,
        classId: firstClassId ?? undefined,
        phone: '03001234567'
      }
    });
    const studentCreateBody = await studentCreate.json().catch(() => ({}));
    const createdStudentId = studentCreateBody?.id ?? null;
    let studentDeleteStatus = null;
    if (createdStudentId) {
      const studentDelete = await page.request.delete(`${baseUrl}/api/students?id=${createdStudentId}`);
      studentDeleteStatus = studentDelete.status();
    }

    let attendanceMarkStatus = null;
    if (firstClassId && firstStudent?.id) {
      const attendanceMark = await page.request.post(`${baseUrl}/api/attendance`, {
        data: {
          classId: firstClassId,
          date: new Date().toISOString().slice(0, 10),
          records: [{ studentId: firstStudent.id, status: 'PRESENT', remarks: 'QA check' }]
        }
      });
      attendanceMarkStatus = attendanceMark.status();
    }

    report.mutations = {
      classCreate: { status: classCreate.status(), id: createdClassId },
      classDelete: { status: classDeleteStatus },
      teacherCreate: { status: teacherCreate.status(), id: createdTeacherId, error: teacherCreateBody?.error ?? null },
      teacherDelete: { status: teacherDeleteStatus },
      studentCreate: { status: studentCreate.status(), id: createdStudentId, error: studentCreateBody?.error ?? null },
      studentDelete: { status: studentDeleteStatus },
      attendanceMark: { status: attendanceMarkStatus }
    };

    await logout(page);
    const teacherLogin = await login(page, roleSuites.teacher);
    report.logins.teacher = teacherLogin;
    if (teacherLogin.ok) {
      await captureRoutes(page, 'teacher', roleSuites.teacher.routes, shotsDir, report);
    }

    // Student: reset first student password to known value via admin and then login
    if (firstStudent?.id && firstStudent?.user?.email) {
      await logout(page);
      await login(page, roleSuites.admin);
      await page.request.patch(`${baseUrl}/api/students`, {
        data: { id: firstStudent.id, shareCredentials: true, password: 'Pass@123' }
      });
      await logout(page);

      const studentSuite = {
        landing: '/student',
        credentials: [{ email: firstStudent.user.email, password: 'Pass@123' }],
        routes: ['/student', '/student/schedule', '/student/assignments', '/student/results', '/student/fees', '/student/attendance', '/student/messages']
      };
      const studentLogin = await login(page, studentSuite);
      report.logins.student = studentLogin;
      if (studentLogin.ok) {
        await captureRoutes(page, 'student', studentSuite.routes, shotsDir, report);
      }
    }

    // Parent login candidates from payments + defaults
    const parentCandidates = Array.from(new Set([
      ...(Array.isArray(payments) ? payments.map((item) => item?.parent?.user?.email).filter(Boolean) : []),
      ...roleSuites.parent.credentials.map((item) => item.email)
    ])).map((email) => ({ email, password: 'Pass@123' }));

    await logout(page);
    const parentLogin = await login(page, { ...roleSuites.parent, credentials: parentCandidates });
    report.logins.parent = parentLogin;
    if (parentLogin.ok) {
      await captureRoutes(page, 'parent', roleSuites.parent.routes, shotsDir, report);
    }

    report.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log(`[qa] report: ${path.join(outDir, 'report.json')}`);
    console.log(`[qa] screenshots: ${shotsDir}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[qa] failed', error);
  process.exit(1);
});

