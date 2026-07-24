import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import prisma from '@/lib/db'

export type FamilyRole = 'OWNER' | 'MEMBER'

export interface AuthenticatedFamily {
  userId: string
  familyId: string
  role: FamilyRole
  family: {
    id: string
    name: string
    parentId: string
    createdAt: Date
    updatedAt: Date
  }
}

export async function getAuthenticatedFamily(): Promise<AuthenticatedFamily | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  const family = await prisma.family.findFirst({
    where: { parentId: session.user.id },
  })

  if (family) {
    return {
      userId: session.user.id,
      familyId: family.id,
      role: 'OWNER',
      family,
    }
  }

  const membership = await prisma.familyMember.findFirst({
    where: { parentId: session.user.id },
    include: { family: true },
  })

  if (membership) {
    return {
      userId: session.user.id,
      familyId: membership.familyId,
      role: membership.role === 'OWNER' ? 'OWNER' : 'MEMBER',
      family: membership.family,
    }
  }

  return null
}

/** Family owners only — invites, destructive family admin. */
export async function requireFamilyOwner(): Promise<
  | { auth: AuthenticatedFamily; error: null }
  | { auth: null; error: Response }
> {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    return { auth: null, error: unauthorized() }
  }
  if (auth.role !== 'OWNER') {
    return { auth: null, error: forbidden('Only the family owner can do this') }
  }
  return { auth, error: null }
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
