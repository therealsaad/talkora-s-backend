import { env } from '../../config/env'
import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'
import { MockSpeechProvider } from './MockSpeechProvider'

export function getSpeechProvider(): SpeechRecognitionProvider {
  switch (env.speechProvider) {
    default:
      return new MockSpeechProvider()
  }
}

export type { SpeechRecognitionProvider } from './SpeechRecognitionProvider'
