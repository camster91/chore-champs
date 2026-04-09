import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import prisma from '@/lib/db'

export async function getAuthenticatedFamily() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const parent = await prisma.parent.findUnique({
    where: { id: session.user.id },
    include: { family: true },
  })

  if (!parent?.family) return null

  return {
    parentId: parent.id,
    familyId: parent.family.id,
    family: parent.family,
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}
