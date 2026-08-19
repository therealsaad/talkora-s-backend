import { Router } from 'express'
import { ProgressController } from '../controllers/progress.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { submitAttemptSchema } from '../schemas/activity.schema'

const router = Router()

router.use(authenticate, requireRole('STUDENT'))
router.get('/classes/:classId', ProgressController.getForClass)
router.post('/activities/:activityId/attempts', validate(submitAttemptSchema), ProgressController.submitAttempt)

export default router
