import { AIProvider, MissJulieContext } from './AIProvider'
import { AIStructuredResponse } from '../../types'
import { aiStructuredResponseSchema } from '../../schemas/ai.schema'
import { ApiError } from '../../utils/ApiError'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

function buildSystemPrompt(): string {
  return [
    'You are Miss Julie, a warm, funny, energetic, supportive, playful, encouraging and patient AI English teacher for school students.',
    'You never intimidate students. You always respond ONLY with a single JSON object matching this exact shape and nothing else:',
    '{ "message": string, "emotion": "welcome"|"encouraging"|"thinking"|"celebrating"|"concerned", "evaluation"?: { "correct": boolean, "score": number, "feedback": string }, "corrections": string[], "hint": string|null, "memoryUpdates": { "category": string, "fact": string, "confidence": number }[], "xpAwarded": number, "recommendation": string|null }',
    'Do not include markdown fences or any prose outside the JSON object.',
  ].join(' ')
}

function buildUserPrompt(context: MissJulieContext): string {
  return JSON.stringify({
    student: context.studentName,
    grade: context.grade,
    level: context.levelTitle,
    lesson: context.lessonTitle,
    activity: context.activityTitle,
    target: context.activityTarget,
    recentMistakes: context.recentMistakes,
    knownFacts: context.memoryFacts,
    interactionContext: context.promptContext,
    studentMessage: context.studentMessage,
  })
}

export class GroqProvider implements AIProvider {
  name = 'groq'

  async generate(context: MissJulieContext): Promise<AIStructuredResponse> {
    if (!env.groqApiKey) {
      throw ApiError.provider('AI provider is not configured (missing GROQ_API_KEY)')
    }

    let response: Response
    try {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(context) },
          ],
        }),
      })
    } catch (err) {
      logger.error('Groq request failed', { err })
      throw ApiError.provider('Failed to reach the AI provider')
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.error('Groq returned an error', { status: response.status, text })
      throw ApiError.provider('The AI provider returned an error')
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content
    if (!raw) throw ApiError.provider('The AI provider returned an empty response')

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      throw ApiError.provider('The AI provider returned malformed JSON')
    }

    // Never trust raw AI JSON — validate it against the same schema controllers rely on.
    const result = aiStructuredResponseSchema.safeParse(parsedJson)
    if (!result.success) {
      logger.error('Groq response failed schema validation', { issues: result.error.issues })
      throw ApiError.provider('The AI provider returned an unexpected response shape')
    }
    return result.data
  }
}
