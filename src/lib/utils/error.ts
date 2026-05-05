import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function getUserFriendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof ZodError) {
    return error.issues.map(e => e.message).join(', ')
  }
  
  if (error instanceof Error) {
    // Don't expose internal error details
    console.error('Internal error:', error)
    return 'Something went wrong. Please try again.'
  }
  
  return 'An unexpected error occurred.'
}

export function logError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${context}]`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
  } else {
    console.error(`[${context}] Unknown error:`, error)
  }
}
