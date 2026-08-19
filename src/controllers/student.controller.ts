import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { StudentService } from '../services/student.service'
import { ProgressService } from '../services/progress.service'
import { CurriculumClass } from '../models/CurriculumClass'
import { ApiError } from '../utils/ApiError'

export const StudentController = {
  list: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { search, grade, className, status, page, limit, sort } = req.query as unknown as {
      search?: string; grade?: number; className?: string; status?: 'active' | 'inactive'; page: number; limit: number; sort?: string
    }
    const { students, total } = await StudentService.list({ schoolId: req.auth.schoolId, search, grade, className, status, page, limit, sort })
    ok(res, { students, total, page, limit })
  }),

  get: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.getById(req.auth.schoolId, req.params.id)
    ok(res, student)
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { student, studentCode } = await StudentService.create(req.auth.schoolId, req.body)
    // studentCode is only ever returned here, at creation, in plaintext — like a one-time temporary password.
    ok(res, { student, studentCode }, 201)
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.update(req.auth.schoolId, req.params.id, req.body)
    ok(res, student)
  }),

  deactivate: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.deactivate(req.auth.schoolId, req.params.id)
    ok(res, student)
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    await StudentService.remove(req.auth.schoolId, req.params.id)
    ok(res, { deleted: true })
  }),

  resetCode: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { student, studentCode } = await StudentService.resetCode(req.auth.schoolId, req.params.id)
    ok(res, { student, studentCode })
  }),

  // --- Self-service (student role) ---

  myProfile: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.getById(req.auth.schoolId, req.auth.id)
    ok(res, student)
  }),

  myProgress: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const klass = await CurriculumClass.findOne({ grade: req.query.grade ? Number(req.query.grade) : undefined })
    const student = await StudentService.getById(req.auth.schoolId, req.auth.id)
    const resolvedClass = klass ?? (await CurriculumClass.findOne({ grade: student.grade }))
    if (!resolvedClass) throw ApiError.notFound('No curriculum found for this grade yet')
    const progress = await ProgressService.getForStudent(req.auth.id, resolvedClass._id.toString())
    ok(res, progress)
  }),
}
