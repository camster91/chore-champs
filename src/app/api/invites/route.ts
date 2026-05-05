import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import crypto from 'crypto'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return NextResponse.json([])
  }

  const invites = await prisma.familyInvite.findMany({
    where: {
      familyId: session.user.familyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(invites)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { email, role = 'MEMBER' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.parent.findUnique({ where: { email } })
    if (existingUser) {
      // If they're already in this family
      if (existingUser.familyId === session.user.familyId) {
        return NextResponse.json({ 
          message: 'This person is already in your family!',
          direct: true 
        })
      }
      
      // If they have a different family, we can't add them directly
      if (existingUser.familyId) {
        return NextResponse.json({ 
          error: 'This person is already in another family. They need to leave their family first.'
        }, { status: 400 })
      }

      // They have no family - add them directly
      await prisma.parent.update({
        where: { id: existingUser.id },
        data: { familyId: session.user.familyId }
      })

      return NextResponse.json({ 
        message: 'Added to your family!',
        direct: true 
      })
    }

    // Create magic link invite
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.familyInvite.create({
      data: {
        email,
        familyId: session.user.familyId,
        role,
        token,
        expiresAt,
        createdById: session.user.id,
      }
    })

    const inviteUrl = `https://kidschore.ashbi.ca/invite/${token}`

    // TODO: Send email with invite link
    // For now, return the URL for copy/paste

    return NextResponse.json({ 
      message: 'Invitation created!',
      inviteUrl,
      direct: false 
    })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('id')

  if (!inviteId) {
    return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })
  }

  await prisma.familyInvite.delete({
    where: { 
      id: inviteId,
      familyId: session.user.familyId
    }
  })

  return NextResponse.json({ success: true })
}
