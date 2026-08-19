import { FilterQuery, Types } from 'mongoose'
import { Student, IStudent } from '../models/Student'
import { hashPassword } from '../utils/password'
import { generateCode } from '../utils/idGenerator'
import { ApiError } from '../utils/ApiError'

export interface ListStudentsParams {
  schoolId: string
  search?: string
  grade?: number
  className?: string
  status?: 'active' | 'inactive'
  page: number
  limit: number
  sort?: string
}

export const StudentService = {
  async list(params: ListStudentsParams) {
    const filter: FilterQuery<IStudent> = { schoolId: params.schoolId }
    if (params.grade) filter.grade = params.grade
    if (params.className) filter.className = params.className
    if (params.status) filter.status = params.status
    if (params.search) {
      filter.$or = [
        { fullName: { $regex: params.search, $options: 'i' } },
        { rollNumber: { $regex: params.search, $options: 'i' } },
        { studentCode: { $regex: params.search.toUpperCase(), $options: 'i' } },
      ]
    }

    const skip = (params.page - 1) * params.limit
    const sort = params.sort ?? 'fullName'

    const [students, total] = await Promise.all([
      Student.find(filter).sort(sort).skip(skip).limit(params.limit).lean(),
      Student.countDocuments(filter),
    ])

    return {
      students: students.map((student) => ({
        ...student,
        id: student._id.toString(),
      })),
      total,
    }
  },

  async getById(schoolId: string, id: string) {
    const student = await Student.findOne({ _id: id, schoolId })
    if (!student) throw ApiError.notFound('Student not found')
    return student
  },

  async create(schoolId: string, input: { fullName: string; rollNumber: string; grade: number; className?: string; teacherId?: string; avatar?: string }) {
    const studentCode = generateCode(4)
    const passwordHash = await hashPassword(studentCode)

    try {
      const student = await Student.create({
        schoolId,
        teacherId: input.teacherId,
        fullName: input.fullName,
        rollNumber: input.rollNumber,
        grade: input.grade,
        className: input.className,
        avatar: input.avatar,
        studentCode,
        passwordHash,
      })
      // studentCode is returned once, in plaintext, at creation time only — like a temporary password.
      return { student, studentCode }
    } catch (err) {
      if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
        throw ApiError.conflict('A student with this roll number already exists in this school')
      }
      throw err
    }
  },

  async update(schoolId: string, id: string, updates: Partial<Pick<IStudent, 'fullName' | 'rollNumber' | 'grade' | 'className' | 'teacherId' | 'avatar' | 'status'>>) {
    const student = await Student.findOneAndUpdate({ _id: id, schoolId }, updates, { new: true, runValidators: true })
    if (!student) throw ApiError.notFound('Student not found')
    return student
  },

  async deactivate(schoolId: string, id: string) {
    const student = await Student.findOneAndUpdate({ _id: id, schoolId }, { status: 'inactive' }, { new: true })
    if (!student) throw ApiError.notFound('Student not found')
    return student
  },

  async remove(schoolId: string, id: string) {
    const result = await Student.deleteOne({ _id: id, schoolId })
    if (result.deletedCount === 0) throw ApiError.notFound('Student not found')
  },

  async resetCode(schoolId: string, id: string) {
    const studentCode = generateCode(4)
    const passwordHash = await hashPassword(studentCode)
    const student = await Student.findOneAndUpdate({ _id: id, schoolId }, { passwordHash }, { new: true })
    if (!student) throw ApiError.notFound('Student not found')
    return { student, studentCode }
  },
}
