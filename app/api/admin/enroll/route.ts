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
    const { fullName, dateOfBirth, email, phone } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const admissionNo = 'SCH-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
    const passwordHash = await hash('Pass@123', 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: UserRole.STUDENT,
        phone: phone || null,
        studentProfile: {
          create: {
            admissionNo,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          },
        },
      },
    });

    return NextResponse.json({ id: user.id, admissionNo }, { status: 201 });
  } catch (err) {
    console.error('Enroll error:', err);
    return NextResponse.json({ error: 'Failed to enroll student' }, { status: 500 });
  }
}
