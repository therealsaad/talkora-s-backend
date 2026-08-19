import { z } from 'zod'

export const startVoiceSessionSchema = z.object({
  body: z.object({
    lessonId: z.string().optional(),
    activityId: z.string().optional(),
  }),
})

export const submitVoiceTranscriptSchema = z.object({
  body: z.object({
    transcript: z.string().min(0).max(2000),
    expected: z.string().optional(),
  }),
  params: z.object({ sessionId: z.string() }),
})
