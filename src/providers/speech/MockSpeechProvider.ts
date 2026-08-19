import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'

export class MockSpeechProvider implements SpeechRecognitionProvider {
  name = 'mock'
  async transcribe(_audioBase64: string) {
    return { transcript: null, available: false }
  }
}
