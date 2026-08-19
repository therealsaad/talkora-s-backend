import { env } from '../../config/env'
import { VoiceProvider } from './VoiceProvider'
import { MockVoiceProvider } from './MockVoiceProvider'

export function getVoiceProvider(): VoiceProvider {
  // Real vendor implementations (e.g. ElevenLabs, OpenAI TTS) plug in here behind this
  // same interface. Until credentials are configured, we intentionally fall back to the
  // mock and mark responses as unavailable rather than fake a working voice pipeline.
  switch (env.voiceProvider) {
    default:
      return new MockVoiceProvider()
  }
}

export type { VoiceProvider } from './VoiceProvider'
