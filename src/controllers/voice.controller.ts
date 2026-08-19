import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { VoiceService } from '../services/voice.service'
import { LearningEvent } from '../models/LearningEvent'
import { ApiError } from '../utils/ApiError'

export const VoiceController = {
  start: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const session = await VoiceService.startSession(req.auth.id, req.body)
    await LearningEvent.create({ studentId: req.auth.id, type: 'voice_session_started', lessonId: req.body.lessonId, activityId: req.body.activityId })
    ok(res, session, 201)
  }),

  submitTranscript: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const session = await VoiceService.submitTranscript(req.auth.id, req.params.sessionId, req.body)
    await LearningEvent.create({ studentId: req.auth.id, type: 'voice_session_completed', metadata: { sessionId: session._id } })
    ok(res, session)
  }),

  synthesize: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { text } = req.body
    if (!text) throw ApiError.badRequest('text is required')
    ok(res, await VoiceService.synthesize(text))
  }),
}
