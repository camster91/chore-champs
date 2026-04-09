import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest } from '@/lib/auth/helpers'

export async function GET() {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const kids = await prisma.kid.findMany({
    where: { familyId: auth.familyId },
    include: {
      _count: {
        select: {
          choreAssignments: { where: { status: 'COMPLETED' } },
          earnedBadges: true,
          redeemedRewards: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(kids)
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const body = await request.json()
  const { name, age, avatarId, themeMode, primaryColor, secondaryColor } = body

  if (!name || !age) {
    return badRequest('Name and age are required')
  }

  if (age < 1 || age > 18) {
    return badRequest('Age must be between 1 and 18')
  }

  const kid = await prisma.kid.create({
    data: {
      name,
      age: parseInt(age),
      avatarId: avatarId || 'default',
      themeMode: themeMode || 'NEUTRAL',
      primaryColor: primaryColor || '#6366f1',
      secondaryColor: secondaryColor || '#8b5cf6',
      familyId: auth.familyId,
    },
  })

  return NextResponse.json(kid, { status: 201 })
}
