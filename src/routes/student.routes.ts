import { Router } from 'express'
import { StudentController } from '../controllers/student.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createStudentSchema, updateStudentSchema, listStudentsQuerySchema } from '../schemas/student.schema'

const router = Router()

// Student self-service routes (role: STUDENT) — identity is always derived from the token.
router.get('/me', authenticate, requireRole('STUDENT'), StudentController.myProfile)
router.get('/me/progress', authenticate, requireRole('STUDENT'), StudentController.myProgress)

// School/teacher CRUD over students in their own school.
router.use(authenticate, requireRole('SCHOOL_ADMIN', 'TEACHER'))
router.get('/', validate(listStudentsQuerySchema), StudentController.list)
router.post('/', validate(createStudentSchema), StudentController.create)
router.get('/:id', StudentController.get)
router.patch('/:id', validate(updateStudentSchema), StudentController.update)
router.delete('/:id', StudentController.remove)
router.post('/:id/deactivate', StudentController.deactivate)
router.post('/:id/reset-code', StudentController.resetCode)

export default router
