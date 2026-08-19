export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR'
  | 'BUSINESS_RULE_ERROR'

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly details?: unknown

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details)
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, 'FORBIDDEN', message)
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message)
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message)
  }
  static businessRule(message: string) {
    return new ApiError(422, 'BUSINESS_RULE_ERROR', message)
  }
  static rateLimited(message = 'Too many requests') {
    return new ApiError(429, 'RATE_LIMITED', message)
  }
  static provider(message: string) {
    return new ApiError(502, 'PROVIDER_ERROR', message)
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message)
  }
}
