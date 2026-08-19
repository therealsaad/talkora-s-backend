import { AIStructuredResponse } from '../../types'

export interface MissJulieContext {
  studentName: string
  grade: number
  levelTitle: string
  lessonTitle: string
  activityTitle?: string
  activityTarget?: string
  recentMistakes: string[]
  memoryFacts: string[]
  promptContext: string // one of the AI_CONTEXT values from ai.schema.ts
  studentMessage: string
}

export interface AIProvider {
  name: string
  generate(context: MissJulieContext): Promise<AIStructuredResponse>
}
