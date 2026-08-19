import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { AuthService } from '../services/auth.service'
import { School } from '../models/School'
import { Teacher } from '../models/Teacher'
import { Student } from '../models/Student'
import { ApiError } from '../utils/ApiError'
import { LearningEvent } from '../models/LearningEvent'

export const AuthController = {
  schoolLogin: catchAsync(async (req: Request, res: Response) => {
    const { schoolCode, password } = req.body
    const result = await AuthService.loginSchool(schoolCode, password)
    ok(res, result)
  }),

  teacherLogin: catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body
    const result = await AuthService.loginTeacher(email, password)
    ok(res, result)
  }),

  studentSchoolLookup: catchAsync(async (req: Request, res: Response) => {
    const { schoolCode } = req.body
    const result = await AuthService.listStudentProfilesForSchool(schoolCode)
    ok(res, result)
  }),

  studentLogin: catchAsync(async (req: Request, res: Response) => {
    const { schoolCode, studentId, studentCode } = req.body
    const result = await AuthService.loginStudent(schoolCode, studentId, studentCode)
    await LearningEvent.create({ studentId: result.student.id, type: 'login' })
    ok(res, result)
  }),

  me: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { id, role, schoolId } = req.auth

    if (role === 'SCHOOL_ADMIN') {
      const school = await School.findById(id).select('name code contactEmail location status')
      if (!school) throw ApiError.notFound('School not found')
      return ok(res, { role, school })
    }
    if (role === 'TEACHER') {
      const teacher = await Teacher.findById(id).select('name email schoolId status')
      if (!teacher) throw ApiError.notFound('Teacher not found')
      const school = await School.findById(schoolId).select('name code')
      if (!school) throw ApiError.notFound('School not found')
      return ok(res, { role, teacher, school })
    }
    const student = await Student.findById(id).select('fullName grade className avatar schoolId status')
    if (!student) throw ApiError.notFound('Student not found')
    const school = await School.findById(schoolId).select('name code')
    if (!school) throw ApiError.notFound('School not found')
    ok(res, { role, student, school })
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    // Stateless JWTs: logout is a client-side token discard. We still log the event for auditing.
    if (req.auth?.role === 'STUDENT') {
      await LearningEvent.create({ studentId: req.auth.id, type: 'logout' })
    }
    ok(res, { loggedOut: true })
  }),
}
