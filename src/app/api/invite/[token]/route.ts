import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params

  const invite = await prisma.familyInvite.findUnique({
    where: { token },
    include: { family: true }
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

  return NextResponse.json({
    familyName: invite.family.name,
    email: invite.email,
    role: invite.role,
  })
}
