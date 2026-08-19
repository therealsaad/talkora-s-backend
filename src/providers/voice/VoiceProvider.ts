export interface VoiceProvider {
  name: string
  /** Synthesizes speech for the given text. Returns a URL/reference to the audio, or null if unavailable. */
  synthesize(text: string): Promise<{ audioUrl: string | null; available: boolean }>
}
