import { env } from '../../config/env'
import { AIProvider } from './AIProvider'
import { GroqProvider } from './GroqProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { MockAIProvider } from './MockAIProvider'

export function getAIProvider(): AIProvider {
  switch (env.aiProvider) {
    case 'groq':
      return new GroqProvider()
    case 'openai':
      return new OpenAIProvider()
    default:
      return new MockAIProvider()
  }
}

export type { AIProvider, MissJulieContext } from './AIProvider'
