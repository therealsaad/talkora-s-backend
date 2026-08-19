import { z } from 'zod'

export const missJulieMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(1000),
    lessonId: z.string().optional(),
    activityId: z.string().optional(),
    context: z.enum([
      'lesson_instruction',
      'activity_feedback',
      'hint',
      'mistake_correction',
      'encouragement',
      'speaking',
      'pronunciation',
      'review',
      'level_completion',
      'recommendation',
      'general',
    ]).default('general'),
  }),
})

export const aiStructuredResponseSchema = z.object({
  message: z.string(),
  emotion: z.enum(['welcome', 'encouraging', 'thinking', 'celebrating', 'concerned']),
  evaluation: z
    .object({ correct: z.boolean(), score: z.number().min(0).max(100), feedback: z.string() })
    .optional(),
  corrections: z.array(z.string()).default([]),
  hint: z.string().nullable().optional(),
  memoryUpdates: z
    .array(z.object({ category: z.string(), fact: z.string(), confidence: z.number().min(0).max(1) }))
    .default([]),
  xpAwarded: z.number().min(0).max(1000).default(0),
  recommendation: z.string().nullable().optional(),
})
