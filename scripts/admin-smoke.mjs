import { chromium } from 'playwright';

const base = 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  const stamp = Date.now();
  const studentEmail = `smoke_student_${stamp}@stitchhms.com`;
  const teacherEmail = `smoke_teacher_${stamp}@stitchhms.com`;

  try {
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Email"]', 'admin@stitchhms.com');
    await page.fill('input[placeholder="Password"]', 'Pass@123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 30000 });

    // Student add/delete
    await page.goto(`${base}/admin/students`, { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Full name"]', 'Smoke Student');
    await page.fill('input[placeholder="Email"]', studentEmail);
    await page.fill('input[placeholder="Admission No"]', `SMK-${stamp}`);
    await page.fill('input[placeholder="Password"]', 'Pass@123');
    const selectClass = page.locator('select').first();
    const options = await selectClass.locator('option').count();
    if (options > 1) {
      await selectClass.selectOption({ index: 1 });
    }
    await page.click('button:has-text("Add Student")');
    await page.waitForTimeout(1000);

    const studentRow = page.locator(`tr:has-text("${studentEmail}")`).first();
    if (await studentRow.count()) {
      await studentRow.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(1000);
    }

    // Teacher add/delete
    await page.goto(`${base}/admin/teachers`, { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Full name"]', 'Smoke Teacher');
    await page.fill('input[placeholder="Email"]', teacherEmail);
    await page.fill('input[placeholder="Employee Code"]', `SMK-T-${stamp}`);
    await page.fill('input[placeholder="Password"]', 'Pass@123');
    await page.click('button:has-text("Add Teacher")');
    await page.waitForTimeout(1000);

    const teacherRow = page.locator(`tr:has-text("${teacherEmail}")`).first();
    if (await teacherRow.count()) {
      await teacherRow.locator('button:has-text("Delete")').click();
      await page.waitForTimeout(1000);
    }

    console.log('smoke-ok');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error('smoke-failed', e);
  process.exit(1);
});
