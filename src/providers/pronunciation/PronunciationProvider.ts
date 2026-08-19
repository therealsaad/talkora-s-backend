export interface PronunciationProvider {
  name: string
  evaluate(input: { word: string; transcript: string }): Promise<{
    score: number | null
    errors: string[]
    feedback: string
    available: boolean
  }>
}
