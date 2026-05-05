import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import crypto from 'crypto'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, inviteToken } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingParent = await prisma.parent.findUnique({
      where: { email }
    })

    if (existingParent) {
      // If they have a family already, redirect to login
      if (existingParent.familyId) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 400 }
        )
      }
      // If no family, they can be added to one
    }

    // Handle invite token
    let familyId: string | undefined
    let familyName: string | undefined

    if (inviteToken) {
      const invite = await prisma.familyInvite.findUnique({
        where: { token: inviteToken }
      })

      if (!invite) {
        return NextResponse.json(
          { error: 'Invalid invitation link' },
          { status: 400 }
        )
      }

      if (invite.acceptedAt) {
        return NextResponse.json(
          { error: 'This invitation has already been used' },
          { status: 400 }
        )
      }

      if (new Date() > invite.expiresAt) {
        return NextResponse.json(
          { error: 'This invitation has expired' },
          { status: 400 }
        )
      }

      // If email doesn't match invite, we still allow - the invite email 
      // is just a hint, anyone with the link can join
      familyId = invite.familyId

      const family = await prisma.family.findUnique({ where: { id: familyId } })
      familyName = family?.name
    }

    // If there's an existing user without a family, add them to the invited family
    if (existingParent && !existingParent.familyId && familyId) {
      await prisma.parent.update({
        where: { id: existingParent.id },
        data: { familyId }
      })

      // Mark invite as accepted
      if (inviteToken) {
        await prisma.familyInvite.update({
          where: { token: inviteToken },
          data: { acceptedAt: new Date() }
        })
      }

      return NextResponse.json({
        success: true,
        message: `Welcome back! You've joined ${familyName || 'the family'}!`,
        joinedFamily: true
      })
    }

    // Create new parent and family
    if (!familyId) {
      // Create a new family
      const family = await prisma.family.create({
        data: {
          name: `${name}'s Family`,
        }
      })
      familyId = family.id
      familyName = family.name
    }

    // Create parent (no password needed - magic link auth)
    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        familyId,
        // Set a placeholder password - in production you'd use magic links
        password: crypto.randomBytes(32).toString('hex'), // Random, unusable password
      }
    })

    // Mark invite as accepted
    if (inviteToken) {
      await prisma.familyInvite.update({
        where: { token: inviteToken },
        data: { acceptedAt: new Date() }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Account created! You can now sign in.',
      familyName
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}
