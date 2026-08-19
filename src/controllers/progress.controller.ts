import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { ProgressService } from '../services/progress.service'
import { ApiError } from '../utils/ApiError'

export const ProgressController = {
  submitAttempt: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students submit attempts')
    const { answer, startedAt, hintsUsed, idempotencyKey } = req.body
    const result = await ProgressService.submitAttempt({
      studentId: req.auth.id, // identity derived from the token, never from the request body
      activityId: req.params.activityId,
      answer,
      startedAt: new Date(startedAt),
      hintsUsed,
      idempotencyKey,
    })
    ok(res, result)
  }),

  getForClass: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const progress = await ProgressService.getForStudent(req.auth.id, req.params.classId)
    ok(res, progress)
  }),
}
