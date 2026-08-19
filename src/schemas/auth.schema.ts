import { z } from 'zod'

export const schoolLoginSchema = z.object({
  body: z.object({
    schoolCode: z.string().trim().min(3).max(32),
    password: z.string().min(6).max(128),
  }),
})

export const teacherLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(6).max(128),
  }),
})

export const studentSchoolLookupSchema = z.object({
  body: z.object({
    schoolCode: z.string().trim().min(3).max(32),
  }),
})

export const studentLoginSchema = z.object({
  body: z.object({
    schoolCode: z.string().trim().min(3).max(32),
    studentId: z.string().trim().min(1),
    studentCode: z.string().trim().min(3).max(32),
  }),
})
