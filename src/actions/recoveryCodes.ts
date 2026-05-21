'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'

export async function generateRecoveryCodes(): Promise<{
  codes: string[]
  expireAt: string
  message: string
} | { error: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/recovery-codes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()
    if (!res.ok) {
      return { error: data.error || 'Failed to generate codes' }
    }

    return {
      codes: data.codes,
      expireAt: data.expireAt,
      message: data.message,
    }
  } catch {
    return { error: 'Network error generating codes' }
  }
}

export async function useRecoveryCode(email: string, code: string): Promise<{
  message: string
  resetToken: string
  parentId: string
} | { error: string }> {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/recovery-codes/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { error: data.error || 'Invalid code' }
    }

    return {
      message: data.message,
      resetToken: data.resetToken,
      parentId: data.parentId,
    }
  } catch {
    return { error: 'Network error verifying code' }
  }
}

export async function resetPasswordWithToken(resetToken: string, newPassword: string): Promise<{
  message: string
} | { error: string }> {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/recovery-codes/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { error: data.error || 'Failed to reset password' }
    }

    return { message: data.message }
  } catch {
    return { error: 'Network error resetting password' }
  }
}
