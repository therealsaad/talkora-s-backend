export interface AIStructuredResponse {
  message: string
  emotion: 'welcome' | 'encouraging' | 'thinking' | 'celebrating' | 'concerned'
  evaluation?: {
    correct: boolean
    score: number
    feedback: string
  }
  corrections: string[]
  hint?: string | null
  memoryUpdates: Array<{ category: string; fact: string; confidence: number }>
  xpAwarded: number
  recommendation?: string | null
}
