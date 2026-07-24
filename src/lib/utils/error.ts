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

const INTERNAL_ERROR_PATTERN =
  /prisma|P\d{4}|ECONN|EAI_AGAIN|SQL|stack|at Object\.|Cannot read|TypeError|ENOENT|database|relation "|column "/i

/**
 * Returns a user-safe error message. Prefer AppError / Zod for intentional
 * messages. Plain Error messages are only shown when they look intentional
 * (short, non-internal); otherwise a generic fallback is used so Prisma/DB
 * details never reach the UI.
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof ZodError) {
    return error.issues.map(e => e.message).join(', ')
  }

  if (error instanceof Error) {
    console.error('Internal error:', error)
    const msg = error.message?.trim() ?? ''
    if (
      msg.length > 0 &&
      msg.length <= 160 &&
      !INTERNAL_ERROR_PATTERN.test(msg)
    ) {
      return msg
    }
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
