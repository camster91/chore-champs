import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import prisma from '@/lib/db'

export async function getAuthenticatedFamily() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  // Find family by parentId
  const family = await prisma.family.findFirst({
    where: { parentId: session.user.id }
  })

  if (!family) {
    return null
  }

  return {
    userId: session.user.id,
    familyId: family.id,
    family,
  }
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}

export function notFound(message = 'Not found') {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  })
}

export function badRequest(message = 'Bad request') {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  })
}
