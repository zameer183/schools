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
  subjectId: z.preprocess((value) => (value === '' ? undefined : value), z.string().optional()),
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

import { getSurahById } from './quran';

export const progressCreateSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  date: z.string().min(1),
  lessonType: z.enum(['JUZZ', 'SURAH']),
  juzzNumber: z.number().int().min(1).max(30).optional(),
  lessonNumber: z.number().int().min(1),
  ayahFrom: z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(1).optional()),
  ayahTo: z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(1).optional()),
  tajweeditotal: z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(0).max(99).optional()),
  hifzTotal: z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(0).max(99).optional()),
  surahRanges: z.record(
    z.array(
      z.object({
        surahId: z.number().int().min(1).max(114),
        fromAyah: z.number().int().min(1),
        toAyah: z.number().int().min(1)
      })
    )
  ).optional(),
  notes: z.string().trim().optional()
}).superRefine((value, ctx) => {
  // Validate individual surah ranges
  if (value.surahRanges) {
    for (const [secKey, ranges] of Object.entries(value.surahRanges)) {
      if (Array.isArray(ranges)) {
        for (let i = 0; i < ranges.length; i++) {
          const r = ranges[i];
          const surah = getSurahById(r.surahId);
          if (!surah) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['surahRanges', secKey, i, 'surahId'],
              message: `Invalid surah ID: ${r.surahId}`
            });
            continue;
          }

          if (r.fromAyah < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['surahRanges', secKey, i, 'fromAyah'],
              message: `${secKey} Range ${i + 1}: From Ayah must be at least 1.`
            });
          } else if (r.fromAyah > surah.ayahs) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['surahRanges', secKey, i, 'fromAyah'],
              message: `سورت ${surah.name} میں کل ${surah.ayahs} آیات ہیں۔ آپ ${surah.ayahs} سے زیادہ آیت نمبر (${r.fromAyah}) درج نہیں کر سکتے۔ (You can't add more than extreme value ${surah.ayahs})`
            });
          }

          if (r.toAyah < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['surahRanges', secKey, i, 'toAyah'],
              message: `${secKey} Range ${i + 1}: To Ayah must be at least 1.`
            });
          } else if (r.toAyah > surah.ayahs) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['surahRanges', secKey, i, 'toAyah'],
              message: `سورت ${surah.name} میں کل ${surah.ayahs} آیات ہیں۔ آپ ${surah.ayahs} سے زیادہ آیت نمبر (${r.toAyah}) درج نہیں کر سکتے۔ (You can't add more than extreme value ${surah.ayahs})`
            });
          }

          if (r.fromAyah > r.toAyah) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['surahRanges', secKey, i, 'toAyah'],
              message: `${secKey} Range ${i + 1}: From Ayah (${r.fromAyah}) cannot be greater than To Ayah (${r.toAyah}).`
            });
          }
        }
      }
    }
  }

  if (value.lessonType === 'SURAH') {
    const hasRanges = Boolean(
      value.surahRanges &&
      Object.values(value.surahRanges).some((arr) => Array.isArray(arr) && arr.length > 0)
    );

    if (!value.ayahFrom && !hasRanges) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ayahFrom'],
        message: 'From ayah is required for Surah progress.'
      });
    }

    if (!value.ayahTo && !hasRanges) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ayahTo'],
        message: 'To ayah is required for Surah progress.'
      });
    }

    if (value.ayahFrom && value.ayahTo && value.ayahFrom > value.ayahTo && !hasRanges) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ayahTo'],
        message: 'To ayah must be greater than or equal to From ayah.'
      });
    }
  }
});
