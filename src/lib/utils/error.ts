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

/** True when a message looks like a Prisma / Node / SQL internal leak. */
function looksLikeInternalError(message: string): boolean {
  if (message.length > 200) return true
  return /prisma|ECONNREFUSED|ENOTFOUND|ECONNRESET|P\d{4}|postgres|DATABASE_URL|connection string|at Object\.|at Module\.|SQL|stack trace|node_modules/i.test(
    message
  )
}

export function getUserFriendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof ZodError) {
    return error.issues.map((e) => e.message).join(', ')
  }

  if (error instanceof Error) {
    if (!looksLikeInternalError(error.message)) {
      return error.message
    }
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
