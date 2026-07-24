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

const INTERNAL_ERROR_PATTERNS = [
  /prisma/i,
  /postgres/i,
  /ECONNREFUSED/,
  /ENOTFOUND/,
  /P\d{4}/, // Prisma error codes
  /at\s+\S+\s+\(/, // stack frames
  /node_modules/,
  /Cannot read propert/i,
  /undefined is not/i,
  /Unexpected token/i,
  /failed query/i,
  /connection/i,
  /timeout/i,
]

/** True when a message looks like a safe, intentional user-facing error. */
function isSafeUserMessage(message: string): boolean {
  if (!message || message.length > 200) return false
  if (INTERNAL_ERROR_PATTERNS.some((re) => re.test(message))) return false
  return true
}

export function getUserFriendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof ZodError) {
    return error.issues.map((e) => e.message).join(', ')
  }

  if (error instanceof Error) {
    if (isSafeUserMessage(error.message)) {
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
