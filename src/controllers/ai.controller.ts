import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { MissJulieService } from '../services/missJulie.service'
import { RecommendationService } from '../services/recommendation.service'
import { ApiError } from '../utils/ApiError'

export const AIController = {
  missJulie: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students can talk with Miss Julie')
    const { message, lessonId, activityId, context } = req.body
    const response = await MissJulieService.converse(req.auth.id, { message, lessonId, activityId, context })
    ok(res, response)
  }),

  recommendation: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    ok(res, { recommendations: await RecommendationService.recommendForStudent(req.auth.id) })
  }),
}
