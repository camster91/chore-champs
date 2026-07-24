import prisma from '@/lib/db'
import { Prisma } from '@prisma/client'

const INVITE_ROLE = 'MEMBER'

export type AcceptInviteResult =
  | { ok: true; message: string }
  | { ok: false; status: number; error: string; needsLogin?: boolean }

/**
 * Claim an invite and create a FamilyMember in one transaction.
 * Relies on @@unique([parentId]) on FamilyMember to enforce one membership.
 */
export async function claimFamilyInvite(
  token: string,
  parentId: string
): Promise<AcceptInviteResult> {
  const invite = await prisma.familyInvite.findUnique({ where: { token } })

  if (!invite) {
    return { ok: false, status: 404, error: 'Invalid invitation' }
  }

  if (invite.acceptedAt) {
    return { ok: false, status: 400, error: 'This invitation has already been used' }
  }

  if (new Date() > invite.expiresAt) {
    return { ok: false, status: 400, error: 'This invitation has expired' }
  }

  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { email: true },
  })

  if (!parent || parent.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      ok: false,
      status: 403,
      error: 'This invitation was sent to a different email address',
    }
  }

  const existingFamily = await prisma.family.findUnique({
    where: { parentId },
  })
  if (existingFamily) {
    return {
      ok: false,
      status: 400,
      error:
        'You already belong to a family. Leave your current family before accepting a new invitation.',
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.familyInvite.updateMany({
        where: { id: invite.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      })
      if (claimed.count !== 1) {
        throw new InviteClaimError('This invitation has already been used', 400)
      }

      await tx.familyMember.create({
        data: {
          familyId: invite.familyId,
          parentId,
          role: INVITE_ROLE,
        },
      })
    })
  } catch (err) {
    if (err instanceof InviteClaimError) {
      return { ok: false, status: err.status, error: err.message }
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return {
        ok: false,
        status: 400,
        error:
          'You already belong to a family. Leave your current family before accepting a new invitation.',
      }
    }
    throw err
  }

  return { ok: true, message: 'Welcome to the family!' }
}

class InviteClaimError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'InviteClaimError'
  }
}
