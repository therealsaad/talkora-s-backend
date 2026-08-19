import { VoiceSession } from '../models/VoiceSession'
import { getSpeechProvider } from '../providers/speech'
import { getVoiceProvider } from '../providers/voice'
import { getPronunciationProvider } from '../providers/pronunciation'
import { ApiError } from '../utils/ApiError'
import { Activity } from '../models/Activity'
import { ProgressService } from './progress.service'

export const VoiceService = {
  async startSession(studentId: string, input: { lessonId?: string; activityId?: string }) {
    const voiceProvider = getVoiceProvider()
    return VoiceSession.create({
      studentId,
      lessonId: input.lessonId,
      activityId: input.activityId,
      startedAt: new Date(),
      provider: voiceProvider.name,
      status: 'active',
    })
  },

  async submitTranscript(studentId: string, sessionId: string, input: { transcript: string; expected?: string }) {
    const session = await VoiceSession.findOne({ _id: sessionId, studentId })
    if (!session) throw ApiError.notFound('Voice session not found')

    const activity = session.activityId ? await Activity.findById(session.activityId).select('target') : null
    const expected = activity?.target || input.expected
    let evaluation: { score: number; feedback: string } | undefined
    if (expected) {
      const pronunciationProvider = getPronunciationProvider()
      const result = await pronunciationProvider.evaluate({ word: expected, transcript: input.transcript })
      evaluation = { score: result.score ?? 0, feedback: result.feedback }
    }

    session.transcript = input.transcript
    session.evaluation = evaluation
    session.endedAt = new Date()
    session.duration = session.endedAt.getTime() - session.startedAt.getTime()
    session.status = 'completed'
    await session.save()

    // Speaking progress is recorded only after the server-side pronunciation evaluation;
    // the browser never gets to choose a score or award itself XP.
    if (session.activityId && evaluation) {
      await ProgressService.submitAttempt({
        studentId,
        activityId: session.activityId.toString(),
        answer: input.transcript,
        startedAt: session.startedAt,
        hintsUsed: 0,
        idempotencyKey: `voice:${session._id.toString()}`,
        evaluation,
      })
    }

    return session
  },

  async synthesize(text: string) {
    const provider = getVoiceProvider()
    return provider.synthesize(text)
  },

  async transcribeAudio(audioBase64: string) {
    const provider = getSpeechProvider()
    return provider.transcribe(audioBase64)
  },
}
