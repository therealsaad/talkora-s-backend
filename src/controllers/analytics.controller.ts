import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { AnalyticsService } from '../services/analytics.service'
import { ApiError } from '../utils/ApiError'

export const AnalyticsController = {
  overview: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    ok(res, await AnalyticsService.schoolOverview(req.auth.schoolId))
  }),

  weakestSkills: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    ok(res, await AnalyticsService.weakestSkillsForSchool(req.auth.schoolId))
  }),
}
