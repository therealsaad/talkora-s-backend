import dotenv from 'dotenv'
dotenv.config()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5000),

  mongodbUri: required('MONGODB_URI', process.env.NODE_ENV === 'test' ? 'mongodb://localhost:27017/talkora-test' : undefined),

  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'test' ? 'test-secret-do-not-use-in-prod' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',

  aiProvider: (process.env.AI_PROVIDER ?? 'mock') as 'groq' | 'openai' | 'mock',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',

  voiceProvider: process.env.VOICE_PROVIDER ?? 'mock',
  speechProvider: process.env.SPEECH_PROVIDER ?? 'mock',
  pronunciationProvider: process.env.PRONUNCIATION_PROVIDER ?? 'mock',

  seed: {
    schoolCode: process.env.SEED_SCHOOL_CODE ?? 'DEMO001',
    schoolPassword: process.env.SEED_SCHOOL_PASSWORD ?? 'talkora123',
    teacherEmail: process.env.SEED_TEACHER_EMAIL ?? 'teacher@demo.talkora.dev',
    teacherPassword: process.env.SEED_TEACHER_PASSWORD ?? 'teacher123',
  },
}
