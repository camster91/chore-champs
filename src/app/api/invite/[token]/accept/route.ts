import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { claimFamilyInvite } from '@/lib/invites/claim'

type Props = {
  params: Promise<{ token: string }>
}

export async function POST(request: Request, { params }: Props) {
  try {
    const ip = getClientIp(request)
    const { allowed, retryAfter } = await checkRateLimit(ip, 'invite-accept', 10, 15 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const { token } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ needsLogin: true }, { status: 401 })
    }

    const result = await claimFamilyInvite(token, session.user.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Invite accept error:', error)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}
