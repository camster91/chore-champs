import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

type Props = {
  params: Promise<{ token: string }>
}

export async function POST(request: Request, { params }: Props) {
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

  const user = await prisma.parent.findUnique({ 
    where: { id: session.user.id }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.familyId === invite.familyId) {
    return NextResponse.json({ error: 'You are already in this family' }, { status: 400 })
  }

  if (user.familyId) {
    return NextResponse.json({ 
      requiresLeave: true,
      message: 'You need to leave your current family to join a new one.'
    }, { status: 400 })
  }

  await prisma.parent.update({
    where: { id: session.user.id },
    data: { familyId: invite.familyId }
  })

  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() }
  })

  revalidatePath('/settings')
  revalidatePath('/dashboard')

  return NextResponse.json({ success: true, message: 'Welcome to the family!' })
}
