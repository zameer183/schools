import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureApiRole } from '@/lib/rbac';
import { hash } from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function generateAdmissionNo() {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `SCH-${year}-${suffix}`;
}

function isPrismaRecoverableError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientInitializationError' ||
      error.message.includes("Can't reach database server") ||
      error.message.includes('Timed out fetching a new connection') ||
      error.message.includes('prepared statement') ||
      error.message.includes('Transaction API error'))
  ) || (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P1001', 'P1017', 'P2021', 'P2022', 'P2024', 'P2028'].includes(error.code)
  );
}

async function supabaseRest<T>(
  table: string,
  params: Record<string, string>,
  init?: { method?: string; body?: unknown; prefer?: string }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase REST fallback is not configured');
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init?.prefer ? { Prefer: init.prefer } : {})
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${table} failed with ${response.status}: ${text}`);
  }

  if (response.status === 204) return [] as T[];
  const text = await response.text();
  return text ? (JSON.parse(text) as T[]) : ([] as T[]);
}

function toDateOrNull(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function ensureStudentClassTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "StudentClass" (
      "id" TEXT PRIMARY KEY,
      "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
      "classId" TEXT NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudentClass_studentId_classId_key" UNIQUE ("studentId", "classId")
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "StudentClass_studentId_idx" ON "StudentClass"("studentId")`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "StudentClass_classId_idx" ON "StudentClass"("classId")`;
}

type EnrollmentInput = {
  fullName: string;
  dateOfBirth: unknown;
  email: string | null | undefined;
  phone: string | null | undefined;
  classId: string;
  additionalClassIds: string[];
  guardianPhone: string | null | undefined;
  guardianEmail: string | null | undefined;
  fatherName: string | null | undefined;
  gender: string | null | undefined;
  aadharNo: string | null | undefined;
  rollNumber: string | null | undefined;
  whatsApp: string | null | undefined;
  schoolName: string | null | undefined;
  joinDate: unknown;
  resolvedCurrentAddress: string | null;
  passwordHash: string;
  feeCreateData: {
    title: string;
    dueDate: Date;
    amount: number;
    discount: number;
    feeCategory: string | null;
    feeType: string | null;
    fromDate: Date | null;
    toDate: Date | null;
    status: PaymentStatus;
    partialFeeSupported: boolean;
    collectOnMonthStart: boolean;
  };
};

async function createEnrollmentViaSupabaseRest(input: EnrollmentInput) {
  const [classRow] = await supabaseRest<{ id: string }>('Class', {
    select: 'id',
    id: `eq.${input.classId}`,
    limit: '1'
  });
  if (!classRow) {
    return NextResponse.json({ error: 'Selected class not found' }, { status: 400 });
  }
  if (input.additionalClassIds.length) {
    const extraRows = await supabaseRest<{ id: string }>('Class', {
      select: 'id',
      id: `in.(${input.additionalClassIds.join(',')})`
    });
    if (extraRows.length !== input.additionalClassIds.length) {
      return NextResponse.json({ error: 'One or more additional classes were not found' }, { status: 400 });
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const admissionNo = generateAdmissionNo();
    const resolvedEmail = input.email?.trim()
      ? input.email.trim()
      : `${admissionNo.toLowerCase().replace(/-/g, '.')}@student.local`;

    let userId: string | null = null;
    try {
      const now = new Date().toISOString();
      userId = randomUUID();
      const [user] = await supabaseRest<{ id: string }>('User', { select: 'id' }, {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          id: userId,
          email: resolvedEmail,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
          role: UserRole.STUDENT,
          phone: input.phone || input.whatsApp || null,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
      });
      userId = user?.id ?? null;
      if (!userId) throw new Error('Supabase REST User insert returned no id');

      const studentId = randomUUID();
      const [student] = await supabaseRest<{ id: string }>('Student', { select: 'id' }, {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          id: studentId,
          userId,
          admissionNo,
          dateOfBirth: toDateOrNull(input.dateOfBirth),
          classId: input.classId,
          guardianPhone: input.guardianPhone || null,
          guardianEmail: input.guardianEmail || null,
          currentAddress: input.resolvedCurrentAddress,
          fatherName: input.fatherName || null,
          gender: input.gender || null,
          aadharNo: input.aadharNo || null,
          rollNumber: input.rollNumber || null,
          whatsApp: input.whatsApp || null,
          schoolName: input.schoolName || null,
          joinDate: toDateOrNull(input.joinDate),
          createdAt: now,
          updatedAt: now
        }
      });
      if (!student?.id) throw new Error('Supabase REST Student insert returned no id');

      await supabaseRest('Fee', { select: 'id' }, {
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          id: randomUUID(),
          studentId,
          title: input.feeCreateData.title,
          dueDate: input.feeCreateData.dueDate.toISOString(),
          amount: input.feeCreateData.amount,
          discount: input.feeCreateData.discount,
          feeCategory: input.feeCreateData.feeCategory,
          feeType: input.feeCreateData.feeType,
          fromDate: input.feeCreateData.fromDate?.toISOString() ?? null,
          toDate: input.feeCreateData.toDate?.toISOString() ?? null,
          status: input.feeCreateData.status,
          partialFeeSupported: input.feeCreateData.partialFeeSupported,
          collectOnMonthStart: input.feeCreateData.collectOnMonthStart,
          createdAt: now,
          updatedAt: now
        }
      });

      for (const classId of input.additionalClassIds.filter((extraClassId) => extraClassId !== input.classId)) {
        await supabaseRest('StudentClass', { select: 'id' }, {
          method: 'POST',
          prefer: 'return=minimal',
          body: {
            id: randomUUID(),
            studentId,
            classId,
            createdAt: now
          }
        });
      }

      return NextResponse.json({
        id: userId,
        admissionNo,
        email: resolvedEmail,
        studentName: input.fullName
      }, { status: 201 });
    } catch (error) {
      if (userId) {
        await supabaseRest('User', { id: `eq.${userId}` }, { method: 'DELETE' }).catch(() => []);
      }
      if (error instanceof Error && error.message.includes('23505') && !input.email?.trim()) {
        continue;
      }
      throw error;
    }
  }

  return NextResponse.json({ error: 'Unable to generate a unique admission number. Please try again.' }, { status: 409 });
}

export async function POST(req: NextRequest) {
  const auth = await ensureApiRole([UserRole.ADMIN]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const {
      fullName, dateOfBirth, email, phone,
      classId, guardianPhone, guardianEmail,
      fatherName, gender, aadharNo, rollNumber,
      additionalClassIds,
      whatsApp, schoolName, joinDate, currentAddress, address,
      feeTitle, feeAmount, feeDiscount, feeDueDate,
      feeCategory, feeType, fromDate, toDate,
      partialFeeSupported, collectOnMonthStart
    } = body;

    const normalizedFeeAmount =
      feeAmount === undefined || feeAmount === null || String(feeAmount).trim() === ''
        ? 0
        : Number(feeAmount);
    const normalizedFeeDiscount =
      feeDiscount === undefined || feeDiscount === null || String(feeDiscount).trim() === ''
        ? 0
        : Number(feeDiscount);
    const normalizedAdditionalClassIds = Array.isArray(additionalClassIds)
      ? Array.from(new Set(additionalClassIds.map((value) => String(value)).filter(Boolean))).filter((extraClassId) => extraClassId !== classId)
      : [];

    if (!fullName || !classId || !Number.isFinite(normalizedFeeAmount) || normalizedFeeAmount < 0) {
      return NextResponse.json({ error: 'Student name and class are required. Fee amount can be 0 or greater.' }, { status: 400 });
    }

    if (!Number.isFinite(normalizedFeeDiscount) || normalizedFeeDiscount < 0) {
      return NextResponse.json({ error: 'Fee discount must be zero or greater' }, { status: 400 });
    }

    if (normalizedFeeDiscount > normalizedFeeAmount) {
      return NextResponse.json({ error: 'Fee discount cannot be greater than fee amount' }, { status: 400 });
    }

    let useRestFallback = false;
    try {
      const classExists = await prisma.class.findUnique({
        where: { id: classId },
        select: { id: true }
      });
      if (!classExists) {
        return NextResponse.json({ error: 'Selected class not found' }, { status: 400 });
      }
      if (normalizedAdditionalClassIds.length) {
        const extraCount = await prisma.class.count({ where: { id: { in: normalizedAdditionalClassIds } } });
        if (extraCount !== normalizedAdditionalClassIds.length) {
          return NextResponse.json({ error: 'One or more additional classes were not found' }, { status: 400 });
        }
      }
      await ensureStudentClassTable();
    } catch (error) {
      if (!isPrismaRecoverableError(error)) throw error;
      useRestFallback = true;
    }

    const dueDate = monthStart(feeDueDate ? new Date(feeDueDate) : new Date());
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Valid fee due date is required' }, { status: 400 });
    }

    const passwordHash = await hash('Pass@123', 12);
    const resolvedCurrentAddress = currentAddress ?? address ?? null;
    const feeCreateData = {
      title: String(feeTitle || (normalizedFeeAmount <= 0 ? 'Free Student' : 'Monthly Tuition Fee')),
      dueDate,
      amount: normalizedFeeAmount,
      discount: normalizedFeeDiscount,
      feeCategory: feeCategory || null,
      feeType: feeType || null,
      fromDate: fromDate ? new Date(fromDate) : null,
      toDate: toDate ? new Date(toDate) : null,
      status: normalizedFeeAmount <= 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
      partialFeeSupported: Boolean(partialFeeSupported),
      collectOnMonthStart: Boolean(collectOnMonthStart),
    };
    const enrollmentInput: EnrollmentInput = {
      fullName,
      dateOfBirth,
      email,
      phone,
      classId,
      additionalClassIds: normalizedAdditionalClassIds,
      guardianPhone,
      guardianEmail,
      fatherName,
      gender,
      aadharNo,
      rollNumber,
      whatsApp,
      schoolName,
      joinDate,
      resolvedCurrentAddress,
      passwordHash,
      feeCreateData
    };

    if (useRestFallback) {
      return await createEnrollmentViaSupabaseRest(enrollmentInput);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const admissionNo = generateAdmissionNo();
      const resolvedEmail = email?.trim()
        ? email.trim()
        : `${admissionNo.toLowerCase().replace(/-/g, '.')}@student.local`;

      try {
        const user = await prisma.user.create({
          data: {
            email: resolvedEmail,
            passwordHash,
            fullName,
            role: UserRole.STUDENT,
            phone: phone || whatsApp || null,
            studentProfile: {
              create: {
                admissionNo,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                classId,
                guardianPhone: guardianPhone || null,
                guardianEmail: guardianEmail || null,
                currentAddress: resolvedCurrentAddress,
                fatherName: fatherName || null,
                gender: gender || null,
                aadharNo: aadharNo || null,
                rollNumber: rollNumber || null,
                whatsApp: whatsApp || null,
                schoolName: schoolName || null,
                joinDate: joinDate ? new Date(joinDate) : null,
                fees: {
                  create: feeCreateData
                }
              },
            },
          },
          include: {
            studentProfile: { select: { id: true } }
          }
        });

        if (user.studentProfile?.id && normalizedAdditionalClassIds.length) {
          for (const extraClassId of normalizedAdditionalClassIds) {
            await prisma.$executeRaw`
              INSERT INTO "StudentClass" ("id", "studentId", "classId")
              VALUES (${randomUUID()}, ${user.studentProfile.id}, ${extraClassId})
              ON CONFLICT ("studentId", "classId") DO NOTHING
            `;
          }
        }

        return NextResponse.json({
          id: user.id,
          admissionNo,
          email: resolvedEmail,
          studentName: fullName,
        }, { status: 201 });
      } catch (err) {
        const isUniqueConflict =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002';

        if (isUniqueConflict && email?.trim()) {
          return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
        }

        if (isPrismaRecoverableError(err)) {
          return await createEnrollmentViaSupabaseRest(enrollmentInput);
        }

        if (!isUniqueConflict) throw err;
      }
    }

    return NextResponse.json({ error: 'Unable to generate a unique admission number. Please try again.' }, { status: 409 });
  } catch (err) {
    console.error('Enroll error:', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return NextResponse.json({ error: 'Email or admission number already exists. Please try again.' }, { status: 409 });
      }
      if (err.code === 'P2003') {
        return NextResponse.json({ error: 'Selected class could not be linked. Please refresh and try again.' }, { status: 400 });
      }
    }
    if (err instanceof Error && err.message.includes('Supabase REST')) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to enroll student' }, { status: 500 });
  }
}
