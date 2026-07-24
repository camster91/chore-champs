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

/** Patterns that indicate an internal/DB error that must never reach the UI. */
function looksLikeInternalError(message: string): boolean {
  return (
    /prisma|ECONN|ENOTFOUND|EACCES|EPERM|P\d{4}|at\s+\S+\s+\(|stack|sql|postgres|mongodb|redis/i.test(
      message
    ) || message.length > 200
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
    // Server actions serialize thrown Errors to the client as plain Error with
    // the original message. Allow short, non-technical messages through (e.g.
    // "Insufficient points") but never leak Prisma/stack/SQL details.
    if (error.message && !looksLikeInternalError(error.message)) {
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
