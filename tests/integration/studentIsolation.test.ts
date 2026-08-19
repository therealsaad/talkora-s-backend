import request from 'supertest'
import { createApp } from '../../src/app'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { hashPassword } from '../../src/utils/password'
import { signToken } from '../../src/utils/jwt'

const app = createApp()

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

describe('student data isolation', () => {
  it('student A cannot fetch student B via the school student-management endpoint (requires school/teacher role)', async () => {
    const school = await School.create({ name: 'School', code: 'ISO001', passwordHash: await hashPassword('pw'), status: 'active' })
    const studentA = await Student.create({ schoolId: school._id, fullName: 'A', rollNumber: '01', grade: 4, studentCode: 'AAAA', passwordHash: await hashPassword('AAAA'), status: 'active' })
    const studentB = await Student.create({ schoolId: school._id, fullName: 'B', rollNumber: '02', grade: 4, studentCode: 'BBBB', passwordHash: await hashPassword('BBBB'), status: 'active' })

    const tokenA = signToken({ sub: studentA._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })

    // A student token has no access to the /api/students/:id admin route at all.
    const res = await request(app).get(`/api/students/${studentB._id}`).set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(403)
  })

  it("a student's own progress endpoint only ever reflects their own token identity, never a body-supplied id", async () => {
    const school = await School.create({ name: 'School', code: 'ISO002', passwordHash: await hashPassword('pw'), status: 'active' })
    const studentA = await Student.create({ schoolId: school._id, fullName: 'A', rollNumber: '01', grade: 4, studentCode: 'AAAA', passwordHash: await hashPassword('AAAA'), status: 'active' })
    const tokenA = signToken({ sub: studentA._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })

    // Even if a malicious client tried to smuggle another studentId in the body, the route
    // has no such field — identity comes exclusively from the verified token.
    const res = await request(app).get('/api/students/me').set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(200)
    expect(res.body.data._id).toBe(studentA._id.toString())
  })

  it('a teacher from one school cannot manage students of another school', async () => {
    const { Teacher } = await import('../../src/models/Teacher')
    const schoolX = await School.create({ name: 'X', code: 'SCHX01', passwordHash: await hashPassword('pw'), status: 'active' })
    const schoolY = await School.create({ name: 'Y', code: 'SCHY01', passwordHash: await hashPassword('pw'), status: 'active' })
    const teacherX = await Teacher.create({ schoolId: schoolX._id, name: 'T', email: 't@x.dev', passwordHash: await hashPassword('pw'), status: 'active' })
    const studentY = await Student.create({ schoolId: schoolY._id, fullName: 'Y-Student', rollNumber: '01', grade: 4, studentCode: 'YYYY', passwordHash: await hashPassword('YYYY'), status: 'active' })

    const tokenTeacherX = signToken({ sub: teacherX._id.toString(), role: 'TEACHER', schoolId: schoolX._id.toString() })
    const res = await request(app).get(`/api/students/${studentY._id}`).set('Authorization', `Bearer ${tokenTeacherX}`)
    // The service scopes the query by req.auth.schoolId, so a cross-school id simply isn't found.
    expect(res.status).toBe(404)
  })
})
