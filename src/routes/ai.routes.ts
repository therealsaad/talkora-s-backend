import { Router } from 'express'
import { AIController } from '../controllers/ai.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimit'
import { missJulieMessageSchema } from '../schemas/ai.schema'

const router = Router()

router.use(authenticate, requireRole('STUDENT'), aiLimiter)
router.post('/miss-julie', validate(missJulieMessageSchema), AIController.missJulie)
router.get('/recommendation', AIController.recommendation)

export default router
