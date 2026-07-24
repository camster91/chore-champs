import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import prisma from '@/lib/db'

export type AuthFamily = {
  userId: string
  familyId: string
  isOwner: boolean
  role: 'OWNER' | 'MEMBER'
  family: { id: string; name: string; parentId: string }
}

/**
 * Resolve the caller's live family membership from the DB (not JWT claims).
 * Prefer this over session.user.familyId for any authz decision.
 */
export async function getAuthenticatedFamily(): Promise<AuthFamily | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  // Check ownership first
  const family = await prisma.family.findFirst({
    where: { parentId: session.user.id },
  })

  if (family) {
    return {
      userId: session.user.id,
      familyId: family.id,
      isOwner: true,
      role: 'OWNER',
      family,
    }
  }

  // Check membership
  const membership = await prisma.familyMember.findFirst({
    where: { parentId: session.user.id },
    include: { family: true },
  })

  if (membership) {
    const role = membership.role === 'OWNER' ? 'OWNER' : 'MEMBER'
    return {
      userId: session.user.id,
      familyId: membership.familyId,
      isOwner: role === 'OWNER',
      role,
      family: membership.family,
    }
  }

  return null
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function forbidden(message = 'Forbidden') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function notFound(message = 'Not found') {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function badRequest(message = 'Bad request') {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}
