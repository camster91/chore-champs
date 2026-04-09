import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { searchParams } = new URL(request.url)
  const kidId = searchParams.get('kidId')

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
  })

  const result = badges.map((badge) => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    earned: kidId ? badge.earnedBy?.length > 0 : false,
    earnedAt: kidId ? badge.earnedBy?.[0]?.earnedAt : null,
  }))

  return NextResponse.json(result)
}
