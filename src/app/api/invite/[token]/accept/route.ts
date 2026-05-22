import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

type Props = {
  params: Promise<{ token: string }>
}

export async function POST(request: Request, { params }: Props) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = checkRateLimit(ip, 'invite-accept', 10, 15 * 60 * 1000)
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

  const invite = await prisma.familyInvite.findUnique({
    where: { token }
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 })
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
  }

  // Verify the invitee email matches the session user
  const parent = await prisma.parent.findUnique({
    where: { id: session.user.id },
    select: { email: true }
  })

  if (!parent || parent.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email address.' },
      { status: 403 }
    )
  }

  // Update Family to set this parent as the member
  await prisma.family.update({
    where: { id: invite.familyId },
    data: { parentId: session.user.id }
  })

  // Mark invite as accepted
  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() }
  })

  revalidatePath('/settings')
  revalidatePath('/dashboard')

  return NextResponse.json({ success: true, message: 'Welcome to the family!' })
}
