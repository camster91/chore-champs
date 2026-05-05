import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

interface BadgeWithEarnedBy {
  id: string
  name: string
  description: string
  icon: string
  category: string
  earnedBy?: { earnedAt: Date }[]
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { searchParams } = new URL(request.url)
  const kidId = searchParams.get('kidId')

  if (kidId) {
    // Verify kid ownership
    const kid = await prisma.kid.findFirst({
      where: { id: kidId, familyId: auth.familyId }
    })
    if (!kid) return unauthorized()
  }

  const badges = await prisma.badgeDefinition.findMany({
    where: {
      OR: [{ familyId: null }, { familyId: auth.familyId }],
    },
    include: kidId
      ? {
          earnedBy: {
            where: { kidId },
            select: { earnedAt: true },
          },
        }
      : undefined,
    orderBy: { category: 'asc' },
  }) as BadgeWithEarnedBy[]

  const result = badges.map((badge) => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    earned: kidId ? (badge.earnedBy?.length ?? 0) > 0 : false,
    earnedAt: kidId ? badge.earnedBy?.[0]?.earnedAt : null,
  }))

  return NextResponse.json(result)
}
