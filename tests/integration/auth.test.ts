import request from 'supertest'
import { createApp } from '../../src/app'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'
import { School } from '../../src/models/School'
import { Teacher } from '../../src/models/Teacher'
import { Student } from '../../src/models/Student'
import { hashPassword } from '../../src/utils/password'

const app = createApp()

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

async function seedSchoolTeacherStudent() {
  const school = await School.create({ name: 'Test School', code: 'TEST001', passwordHash: await hashPassword('schoolpass'), status: 'active' })
  const teacher = await Teacher.create({ schoolId: school._id, name: 'Ms Test', email: 'teacher@test.dev', passwordHash: await hashPassword('teacherpass'), status: 'active' })
  const student = await Student.create({
    schoolId: school._id,
    teacherId: teacher._id,
    fullName: 'Test Student',
    rollNumber: '01',
    grade: 4,
    studentCode: 'ABCD',
    passwordHash: await hashPassword('ABCD'),
    status: 'active',
  })
  return { school, teacher, student }
}

describe('POST /api/auth/school/login', () => {
  it('logs in with correct credentials', async () => {
    await seedSchoolTeacherStudent()
    const res = await request(app).post('/api/auth/school/login').send({ schoolCode: 'TEST001', password: 'schoolpass' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
  })

  it('rejects incorrect password', async () => {
    await seedSchoolTeacherStudent()
    const res = await request(app).post('/api/auth/school/login').send({ schoolCode: 'TEST001', password: 'wrongpassword' })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /api/auth/student/login', () => {
  it('logs in with correct student code and survives GET /api/auth/me', async () => {
    const { school, student } = await seedSchoolTeacherStudent()
    const loginRes = await request(app)
      .post('/api/auth/student/login')
      .send({ schoolCode: school.code, studentId: student._id.toString(), studentCode: 'ABCD' })
    expect(loginRes.status).toBe(200)
    const token = loginRes.body.data.token

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(meRes.status).toBe(200)
    expect(meRes.body.data.role).toBe('STUDENT')
    expect(meRes.body.data.student.fullName).toBe('Test Student')
  })

  it('rejects a wrong student code', async () => {
    const { school, student } = await seedSchoolTeacherStudent()
    const res = await request(app)
      .post('/api/auth/student/login')
      .send({ schoolCode: school.code, studentId: student._id.toString(), studentCode: 'WRONG' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me without a token', () => {
  it('returns 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
