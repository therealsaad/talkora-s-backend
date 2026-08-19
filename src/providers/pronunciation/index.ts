import { env } from '../../config/env'
import { PronunciationProvider } from './PronunciationProvider'
import { MockPronunciationProvider } from './MockPronunciationProvider'

export function getPronunciationProvider(): PronunciationProvider {
  switch (env.pronunciationProvider) {
    default:
      return new MockPronunciationProvider()
  }
}

export type { PronunciationProvider } from './PronunciationProvider'
