import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error'
import { generalLimiter } from './middleware/rateLimit'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(morgan(env.isProd ? 'combined' : 'dev'))
  app.use(generalLimiter)

  app.use('/api/v1', routes)
  app.use('/api', routes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
