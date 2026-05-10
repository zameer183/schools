import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole } from '@prisma/client';

const DEFAULT_TEMPLATES = [
  {
    key: 'registration',
    name: 'Registration Message',
    description: 'Sent when a new student is registered.',
    body: `Assalamu Alaikum! 🎉\n\nDear {guardianName},\n\n{studentName} has been successfully registered at {instituteName}.\n\n📋 Admission No: {admissionNo}\n🏫 Class: {className}\n\nWelcome to our family! For any queries, contact us.\n\nJazakAllah Khair`,
    variables: '{studentName},{guardianName},{admissionNo},{className},{instituteName}',
  },
  {
    key: 'fee_reminder',
    name: 'Fee Reminder',
    description: 'Sent to remind parents about pending fee payment.',
    body: `Assalamu Alaikum,\n\nDear {guardianName},\n\nThis is a reminder that the fee for {studentName} is due.\n\n💰 Amount: PKR {amount}\n📅 Due Date: {dueDate}\n\nPlease pay at the earliest to avoid any inconvenience.\n\nJazakAllah Khair\n{instituteName}`,
    variables: '{studentName},{guardianName},{amount},{dueDate},{instituteName}',
  },
  {
    key: 'fee_receipt',
    name: 'Fee Receipt',
    description: 'Sent after successful fee payment.',
    body: `Assalamu Alaikum,\n\nDear {guardianName},\n\nFee payment received for {studentName}. ✅\n\n💰 Amount Paid: PKR {amount}\n📅 Date: {date}\n🧾 Receipt No: {receiptNo}\n\nJazakAllah Khair\n{instituteName}`,
    variables: '{studentName},{guardianName},{amount},{date},{receiptNo},{instituteName}',
  },
  {
    key: 'attendance',
    name: 'Attendance',
    description: 'Sent to notify parents of student attendance.',
    body: `Assalamu Alaikum,\n\nDear {guardianName},\n\nAttendance update for {studentName}:\n\n📅 Date: {date}\n✅ Status: {status}\n\nIf you have any concerns, please contact us.\n\nJazakAllah Khair\n{instituteName}`,
    variables: '{studentName},{guardianName},{date},{status},{instituteName}',
  },
  {
    key: 'exam',
    name: 'Exam',
    description: 'Sent to share exam/test results with parents.',
    body: `Assalamu Alaikum,\n\nDear {guardianName},\n\nExam result for {studentName}:\n\n📝 Exam: {examTitle}\n📚 Subject: {subject}\n🎯 Marks: {marksObtained}/{totalMarks}\n🏆 Grade: {grade}\n\nJazakAllah Khair\n{instituteName}`,
    variables: '{studentName},{guardianName},{examTitle},{subject},{marksObtained},{totalMarks},{grade},{instituteName}',
  },
  {
    key: 'enquiry',
    name: 'Enquiry',
    description: 'Sent as a follow-up to an admission enquiry.',
    body: `Assalamu Alaikum,\n\nDear {name},\n\nThank you for your enquiry about {instituteName}.\n\nWe would love to assist you further. Please visit us or contact us at your convenience.\n\n📅 Follow-up Date: {followUpDate}\n\nJazakAllah Khair\n{instituteName}`,
    variables: '{name},{followUpDate},{instituteName}',
  },
];

// GET — fetch all templates (seed defaults if empty)
export async function GET() {
  try {
    await requireAuth([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let templates = await prisma.smsTemplate.findMany({ orderBy: { createdAt: 'asc' } });

  // Seed defaults if none exist
  if (templates.length === 0) {
    await prisma.smsTemplate.createMany({ data: DEFAULT_TEMPLATES });
    templates = await prisma.smsTemplate.findMany({ orderBy: { createdAt: 'asc' } });
  }

  return NextResponse.json(templates);
}

// PUT — update a template body
export async function PUT(req: NextRequest) {
  try {
    await requireAuth([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, templateBody, isActive } = body as { id: string; templateBody?: string; isActive?: boolean };

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof templateBody === 'string') data.body = templateBody;
  if (typeof isActive === 'boolean') data.isActive = isActive;

  const updated = await prisma.smsTemplate.update({ where: { id }, data });
  return NextResponse.json(updated);
}
