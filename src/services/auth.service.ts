import { School } from '../models/School'
import { Teacher } from '../models/Teacher'
import { Student } from '../models/Student'
import { hashPassword, comparePassword } from '../utils/password'
import { signToken } from '../utils/jwt'
import { ApiError } from '../utils/ApiError'
import { generateCode } from '../utils/idGenerator'

export const AuthService = {
  async loginSchool(schoolCode: string, password: string) {
    const school = await School.findOne({ code: schoolCode.toUpperCase(), status: 'active' }).select('+passwordHash')
    if (!school) throw ApiError.unauthorized('Invalid school code or password')
    const valid = await comparePassword(password, school.passwordHash)
    if (!valid) throw ApiError.unauthorized('Invalid school code or password')

    const token = signToken({ sub: school._id.toString(), role: 'SCHOOL_ADMIN', schoolId: school._id.toString() })
    return { token, school: { id: school._id, name: school.name, code: school.code } }
  },

  async loginTeacher(email: string, password: string) {
    const teacher = await Teacher.findOne({ email: email.toLowerCase(), status: 'active' }).select('+passwordHash')
    if (!teacher) throw ApiError.unauthorized('Invalid email or password')
    const valid = await comparePassword(password, teacher.passwordHash)
    if (!valid) throw ApiError.unauthorized('Invalid email or password')

    const school = await School.findById(teacher.schoolId).select('name code')
    if (!school) throw ApiError.notFound('Teacher school not found')

    const token = signToken({ sub: teacher._id.toString(), role: 'TEACHER', schoolId: teacher.schoolId.toString() })
    return { token, teacher: { id: teacher._id.toString(), name: teacher.name, email: teacher.email }, school: { id: school._id.toString(), name: school.name, code: school.code } }
  },

  /** Step 1 of student login: look up the school and return the (non-sensitive) profile list for selection. */
  async listStudentProfilesForSchool(schoolCode: string) {
    const school = await School.findOne({ code: schoolCode.toUpperCase(), status: 'active' })
    if (!school) throw ApiError.unauthorized('Invalid school code')
    const students = await Student.find({ schoolId: school._id, status: 'active' })
      .select('fullName rollNumber grade className avatar')
      .lean()
    return {
      school: { id: school._id.toString(), name: school.name, code: school.code },
      students: students.map((student) => ({
        id: student._id.toString(),
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        grade: student.grade,
        className: student.className,
        avatar: student.avatar,
      })),
    }
  },

  /** Step 2 of student login: verify the selected profile's code against the stored hash. */
  async loginStudent(schoolCode: string, studentId: string, studentCode: string) {
    const school = await School.findOne({ code: schoolCode.toUpperCase(), status: 'active' })
    if (!school) throw ApiError.unauthorized('Invalid school code')

    const student = await Student.findOne({ _id: studentId, schoolId: school._id, status: 'active' }).select('+passwordHash')
    if (!student) throw ApiError.unauthorized('Invalid student profile')

    const valid = await comparePassword(studentCode.toUpperCase(), student.passwordHash)
    if (!valid) throw ApiError.unauthorized('Invalid student code')

    student.lastLoginAt = new Date()
    await student.save()

    const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })
    return {
      token,
      student: { id: student._id.toString(), fullName: student.fullName, rollNumber: student.rollNumber, grade: student.grade, className: student.className, avatar: student.avatar },
      school: { id: school._id.toString(), name: school.name, code: school.code },
    }
  },

  async createSchool(input: { name: string; code?: string; password: string; contactEmail?: string; location?: string }) {
    const code = (input.code ?? generateCode(6)).toUpperCase()
    const existing = await School.findOne({ code })
    if (existing) throw ApiError.conflict('School code already in use')
    const passwordHash = await hashPassword(input.password)
    const school = await School.create({ name: input.name, code, passwordHash, contactEmail: input.contactEmail, location: input.location })
    return school
  },
}
