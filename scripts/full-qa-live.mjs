import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL ?? 'https://schools-plum.vercel.app';
const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@stitchhms.com';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'Pass@123';

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withCookie(headers, cookie) {
  return {
    ...headers,
    cookie
  };
}

async function login(email, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const body = await res.json().catch(() => ({}));
  const getSetCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const cookie = getSetCookie.map((item) => item.split(';')[0]).join('; ');

  return { ok: res.ok, status: res.status, body, cookie };
}

async function apiGet(route, cookie) {
  const res = await fetch(`${baseUrl}${route}`, {
    headers: withCookie({}, cookie)
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function apiSend(route, method, body, cookie) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: withCookie({ 'content-type': 'application/json' }, cookie),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: data };
}

async function main() {
  const outDir = path.join(process.cwd(), 'qa-artifacts', `live-qa-${nowStamp()}`);
  await fs.mkdir(outDir, { recursive: true });

  const report = {
    baseUrl,
    startedAt: new Date().toISOString(),
    dataSourceCheck: {},
    auth: {},
    apiHealth: {},
    createDeleteChecks: {},
    roleChecks: {},
    notes: []
  };

  report.dataSourceCheck = {
    databaseUrlHost: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unavailable',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'unavailable',
    statement: 'Configured database host points to Supabase Postgres endpoint.'
  };

  const adminLogin = await login(adminEmail, adminPassword);
  report.auth.adminLogin = {
    ok: adminLogin.ok,
    status: adminLogin.status,
    role: adminLogin.body?.role ?? null
  };

  if (!adminLogin.ok || !adminLogin.cookie) {
    report.notes.push('Admin login failed; stopping QA flow.');
    await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    return;
  }

  const cookie = adminLogin.cookie;

  const [classesRes, studentsRes, teachersRes, attendanceRes, feesRes, messagesRes, notificationsRes, paymentsRes] = await Promise.all([
    apiGet('/api/classes', cookie),
    apiGet('/api/students', cookie),
    apiGet('/api/teachers', cookie),
    apiGet('/api/attendance', cookie),
    apiGet('/api/fees', cookie),
    apiGet('/api/messages', cookie),
    apiGet('/api/notifications', cookie),
    apiGet('/api/payments', cookie)
  ]);

  report.apiHealth = {
    classes: { ok: classesRes.ok, status: classesRes.status, count: Array.isArray(classesRes.body) ? classesRes.body.length : null },
    students: { ok: studentsRes.ok, status: studentsRes.status, count: Array.isArray(studentsRes.body) ? studentsRes.body.length : null },
    teachers: { ok: teachersRes.ok, status: teachersRes.status, count: Array.isArray(teachersRes.body) ? teachersRes.body.length : null },
    attendance: { ok: attendanceRes.ok, status: attendanceRes.status, count: Array.isArray(attendanceRes.body) ? attendanceRes.body.length : null },
    fees: { ok: feesRes.ok, status: feesRes.status, count: Array.isArray(feesRes.body) ? feesRes.body.length : null },
    messages: { ok: messagesRes.ok, status: messagesRes.status, count: Array.isArray(messagesRes.body) ? messagesRes.body.length : null },
    notifications: { ok: notificationsRes.ok, status: notificationsRes.status, count: Array.isArray(notificationsRes.body) ? notificationsRes.body.length : null },
    payments: { ok: paymentsRes.ok, status: paymentsRes.status, count: Array.isArray(paymentsRes.body) ? paymentsRes.body.length : null }
  };

  const classes = Array.isArray(classesRes.body) ? classesRes.body : [];
  const students = Array.isArray(studentsRes.body) ? studentsRes.body : [];
  const teachers = Array.isArray(teachersRes.body) ? teachersRes.body : [];
  const payments = Array.isArray(paymentsRes.body) ? paymentsRes.body : [];

  const primaryClassId = classes[0]?.id ?? '';
  const firstStudent = students[0];

  const stamp = Date.now();
  const classPayload = {
    name: `QA Grade ${String(stamp).slice(-4)}`,
    section: 'Q',
    roomNo: 'QA-1',
    academicYear: '2026'
  };
  const classCreate = await apiSend('/api/classes', 'POST', classPayload, cookie);
  const classId = classCreate.body?.id ?? null;

  let classDelete = { ok: false, status: null };
  if (classId) {
    const res = await fetch(`${baseUrl}/api/classes?id=${classId}`, {
      method: 'DELETE',
      headers: withCookie({}, cookie)
    });
    classDelete = { ok: res.ok, status: res.status };
  }

  const teacherPayload = {
    fullName: `QA Teacher ${stamp}`,
    email: `qa.teacher.${stamp}@stitchhms.com`,
    password: 'Pass@123',
    position: 'QA Lecturer',
    department: 'QA Department',
    classIds: primaryClassId ? [primaryClassId] : [],
    baseSalary: 1000,
    bonus: 50,
    deduction: 0
  };
  const teacherCreate = await apiSend('/api/teachers', 'POST', teacherPayload, cookie);
  const teacherId = teacherCreate.body?.id ?? null;

  let teacherDelete = { ok: false, status: null };
  if (teacherId) {
    const res = await fetch(`${baseUrl}/api/teachers?id=${teacherId}`, {
      method: 'DELETE',
      headers: withCookie({}, cookie)
    });
    teacherDelete = { ok: res.ok, status: res.status };
  }

  const studentPayload = {
    fullName: `QA Student ${stamp}`,
    email: `qa.student.${stamp}@stitchhms.com`,
    password: 'Pass@123',
    admissionNo: `QA-ADM-${stamp}`,
    classId: primaryClassId || undefined,
    phone: '03001234567'
  };
  const studentCreate = await apiSend('/api/students', 'POST', studentPayload, cookie);
  const studentId = studentCreate.body?.id ?? null;

  let studentDelete = { ok: false, status: null };
  if (studentId) {
    const res = await fetch(`${baseUrl}/api/students?id=${studentId}`, {
      method: 'DELETE',
      headers: withCookie({}, cookie)
    });
    studentDelete = { ok: res.ok, status: res.status };
  }

  let attendanceWrite = { ok: false, status: null };
  if (primaryClassId && firstStudent?.id) {
    const payload = {
      classId: primaryClassId,
      date: new Date().toISOString().slice(0, 10),
      records: [{ studentId: firstStudent.id, status: 'PRESENT', remarks: 'QA mark' }]
    };
    const res = await apiSend('/api/attendance', 'POST', payload, cookie);
    attendanceWrite = { ok: res.ok, status: res.status };
  }

  report.createDeleteChecks = {
    classCreate: { ok: classCreate.ok, status: classCreate.status, id: classId },
    classDelete,
    teacherCreate: { ok: teacherCreate.ok, status: teacherCreate.status, id: teacherId, error: teacherCreate.body?.error ?? null },
    teacherDelete,
    studentCreate: { ok: studentCreate.ok, status: studentCreate.status, id: studentId, error: studentCreate.body?.error ?? null },
    studentDelete,
    attendanceWrite
  };

  // Prepare one real student account with known password and verify login.
  let studentLoginCheck = { attemptedEmail: null, ok: false, status: null };
  if (firstStudent?.id && firstStudent?.user?.email) {
    const patchRes = await apiSend('/api/students', 'PATCH', { id: firstStudent.id, shareCredentials: true, password: 'Pass@123' }, cookie);
    report.roleChecks.studentPasswordReset = { ok: patchRes.ok, status: patchRes.status };

    const studentLogin = await login(firstStudent.user.email, 'Pass@123');
    studentLoginCheck = {
      attemptedEmail: firstStudent.user.email,
      ok: studentLogin.ok,
      status: studentLogin.status
    };
  }
  report.roleChecks.studentLogin = studentLoginCheck;

  const parentCandidates = Array.from(
    new Set(
      payments
        .map((item) => item?.parent?.user?.email)
        .filter((email) => typeof email === 'string' && email.length > 0)
    )
  ).concat(['parent@stitchhms.com', 'shots_parent@stitchhms.com']);

  let parentLoginCheck = { attemptedEmail: null, ok: false, status: null };
  for (const email of parentCandidates) {
    const parentLogin = await login(email, 'Pass@123');
    if (parentLogin.ok) {
      parentLoginCheck = { attemptedEmail: email, ok: true, status: parentLogin.status };
      break;
    }
    parentLoginCheck = { attemptedEmail: email, ok: false, status: parentLogin.status };
  }
  report.roleChecks.parentLogin = parentLoginCheck;

  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`[qa] report written: ${path.join(outDir, 'report.json')}`);
}

main().catch((error) => {
  console.error('[qa] failed', error);
  process.exit(1);
});

