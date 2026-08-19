export interface SpeechRecognitionProvider {
  name: string
  /** Transcribes audio (base64) to text. Returns null transcript + available:false if the provider isn't configured. */
  transcribe(audioBase64: string): Promise<{ transcript: string | null; available: boolean }>
}
