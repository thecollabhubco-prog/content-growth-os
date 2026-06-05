import { NextResponse } from 'next/server'

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

export type ApiError = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function ok<T>(data: T, meta?: ApiSuccess<T>['meta'], status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data, meta }, { status })
}

export function created<T>(data: T) {
  return ok(data, undefined, 201)
}

export function err(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json<ApiError>(
    { success: false, error: { code, message, details } },
    { status }
  )
}

export const Errors = {
  unauthorized: () => err('UNAUTHORIZED', 'Authentication required', 401),
  forbidden: () => err('FORBIDDEN', 'Insufficient permissions', 403),
  notFound: (resource = 'Resource') => err('NOT_FOUND', `${resource} not found`, 404),
  validation: (message: string, details?: unknown) => err('VALIDATION_ERROR', message, 422, details),
  internal: (message = 'Internal server error') => err('INTERNAL_ERROR', message, 500),
  aiError: (message = 'AI generation failed') => err('AI_ERROR', message, 502),
  publishError: (message = 'Publishing failed') => err('PUBLISH_ERROR', message, 502),
  externalApi: (message = 'External service error') => err('EXTERNAL_API_ERROR', message, 502),
}
