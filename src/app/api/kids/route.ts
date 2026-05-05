import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest } from '@/lib/auth/helpers'
import { z } from 'zod'

const kidSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.coerce.number().min(1).max(18),
  avatarId: z.string().optional(),
  themeMode: z.enum(['SOLAR', 'CANDY', 'DEEP_SEA', 'FOREST', 'NEUTRAL']).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
})

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

  try {
    const json = await request.json()
    const body = kidSchema.parse(json)
    const { name, age, avatarId, themeMode, primaryColor, secondaryColor } = body

    const kid = await prisma.kid.create({
      data: {
        name,
        age,
        avatarId: avatarId || 'default',
        themeMode: themeMode || 'NEUTRAL',
        primaryColor: primaryColor || '#6366f1',
        secondaryColor: secondaryColor || '#8b5cf6',
        familyId: auth.familyId,
      },
    })

    return NextResponse.json(kid, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0].message)
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
