import { Router } from 'express'
import { VoiceController } from '../controllers/voice.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { voiceLimiter } from '../middleware/rateLimit'
import { startVoiceSessionSchema, submitVoiceTranscriptSchema } from '../schemas/voice.schema'

const router = Router()

router.use(authenticate, voiceLimiter)
router.post('/sessions', requireRole('STUDENT'), validate(startVoiceSessionSchema), VoiceController.start)
router.post('/sessions/:sessionId/transcript', requireRole('STUDENT'), validate(submitVoiceTranscriptSchema), VoiceController.submitTranscript)
router.post('/synthesize', VoiceController.synthesize)

export default router
