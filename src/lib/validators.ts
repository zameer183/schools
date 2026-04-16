import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().trim().min(6)
});

export const studentCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  admissionNo: z.string().trim().min(1, 'Admission number is required'),
  classId: z.preprocess((value) => (value === '' ? undefined : value), z.string().optional()),
  phone: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().optional())
});

export const attendanceSchema = z.object({
  classId: z.string(),
  date: z.string(),
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      remarks: z.string().optional()
    })
  )
});

export const assignmentCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  classId: z.string(),
  subjectId: z.string(),
  dueDate: z.string(),
  maxMarks: z.number().int().min(1).max(1000)
});

export const messageCreateSchema = z.object({
  subject: z.string().min(2),
  body: z.string().min(2),
  recipientIds: z.array(z.string()).min(1)
});

export const notificationCreateSchema = z.object({
  userId: z.string(),
  title: z.string().min(2),
  body: z.string().min(2),
  type: z.enum(['SYSTEM', 'ACADEMIC', 'FINANCIAL', 'ATTENDANCE', 'MESSAGE']).default('SYSTEM')
});

export const progressCreateSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  date: z.string().min(1),
  lessonType: z.enum(['JUZZ', 'SURAH']),
  juzzNumber: z.number().int().min(1).max(30).optional(),
  lessonNumber: z.number().int().min(1),
  ayahFrom: z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(1).optional()),
  ayahTo: z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(1).optional()),
  notes: z.string().trim().optional()
}).superRefine((value, ctx) => {
  if (value.lessonType === 'SURAH') {
    if (!value.ayahFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ayahFrom'],
        message: 'From ayah is required for Surah progress.'
      });
    }

    if (!value.ayahTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ayahTo'],
        message: 'To ayah is required for Surah progress.'
      });
    }

    if (value.ayahFrom && value.ayahTo && value.ayahFrom > value.ayahTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ayahTo'],
        message: 'To ayah must be greater than or equal to From ayah.'
      });
    }
  }
});
