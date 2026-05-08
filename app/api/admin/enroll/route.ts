import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await requireAuth([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      fullName, dateOfBirth, email, phone,
      classId, guardianPhone, guardianEmail,
      fatherName, gender, aadharNo, rollNumber,
      whatsApp, schoolName, joinDate, currentAddress,
      feeTitle, feeAmount, feeDiscount, feeDueDate,
      feeCategory, feeType, fromDate, toDate,
      partialFeeSupported, collectOnMonthStart
    } = body;

    const normalizedFeeAmount = Number(feeAmount);
    const normalizedFeeDiscount = Number(feeDiscount ?? 0);

    if (!fullName || !classId || !feeDueDate || !Number.isFinite(normalizedFeeAmount) || normalizedFeeAmount <= 0) {
      return NextResponse.json({ error: 'Student name, class, fee amount, and fee due date are required' }, { status: 400 });
    }

    if (!Number.isFinite(normalizedFeeDiscount) || normalizedFeeDiscount < 0) {
      return NextResponse.json({ error: 'Fee discount must be zero or greater' }, { status: 400 });
    }

    if (normalizedFeeDiscount > normalizedFeeAmount) {
      return NextResponse.json({ error: 'Fee discount cannot be greater than fee amount' }, { status: 400 });
    }

    const dueDate = new Date(feeDueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Valid fee due date is required' }, { status: 400 });
    }

    const admissionNo = 'SCH-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);

    // Auto-generate email if not provided
    const resolvedEmail = email?.trim()
      ? email.trim()
      : `${admissionNo.toLowerCase().replace(/-/g, '.')}@student.local`;

    const existing = await prisma.user.findUnique({ where: { email: resolvedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hash('Pass@123', 12);

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
            currentAddress: currentAddress || null,
            fatherName: fatherName || null,
            gender: gender || null,
            aadharNo: aadharNo || null,
            rollNumber: rollNumber || null,
            whatsApp: whatsApp || null,
            schoolName: schoolName || null,
            joinDate: joinDate ? new Date(joinDate) : null,
          },
        },
      },
      include: {
        studentProfile: { select: { id: true } }
      }
    });

    if (user.studentProfile?.id) {
      await prisma.fee.create({
        data: {
          studentId: user.studentProfile.id,
          title: String(feeTitle || 'Monthly Tuition Fee'),
          dueDate,
          amount: normalizedFeeAmount,
          discount: normalizedFeeDiscount,
          feeCategory: feeCategory || null,
          feeType: feeType || null,
          fromDate: fromDate ? new Date(fromDate) : null,
          toDate: toDate ? new Date(toDate) : null,
          partialFeeSupported: Boolean(partialFeeSupported),
          collectOnMonthStart: Boolean(collectOnMonthStart),
        }
      });
    }

    return NextResponse.json({
      id: user.id,
      admissionNo,
      email: resolvedEmail,
      studentName: fullName,
    }, { status: 201 });
  } catch (err) {
    console.error('Enroll error:', err);
    return NextResponse.json({ error: 'Failed to enroll student' }, { status: 500 });
  }
}
