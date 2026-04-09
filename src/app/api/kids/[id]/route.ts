import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id } = await params

  const kid = await prisma.kid.findFirst({
    where: { id, familyId: auth.familyId },
    include: {
      earnedBadges: { include: { badge: true } },
      _count: {
        select: {
          choreAssignments: { where: { status: 'COMPLETED' } },
          redeemedRewards: true,
        },
      },
    },
  })

  if (!kid) return notFound('Kid not found')

  return NextResponse.json(kid)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id } = await params
  const body = await request.json()

  const kid = await prisma.kid.findFirst({
    where: { id, familyId: auth.familyId },
  })

  if (!kid) return notFound('Kid not found')

  const allowedFields = ['name', 'age', 'avatarId', 'themeMode', 'primaryColor', 'secondaryColor']
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = field === 'age' ? parseInt(body[field]) : body[field]
    }
  }

  if (updates.age && (Number(updates.age) < 1 || Number(updates.age) > 18)) {
    return badRequest('Age must be between 1 and 18')
  }

  const updated = await prisma.kid.update({
    where: { id },
    data: updates,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id } = await params

  const kid = await prisma.kid.findFirst({
    where: { id, familyId: auth.familyId },
  })

  if (!kid) return notFound('Kid not found')

  await prisma.kid.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
