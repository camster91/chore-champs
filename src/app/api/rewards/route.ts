import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest } from '@/lib/auth/helpers'
import { z } from 'zod'

const rewardSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  cost: z.coerce.number().min(1),
  icon: z.string().optional(),
  category: z.string().optional(),
})

export async function GET() {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const rewards = await prisma.reward.findMany({
    where: {
      familyId: auth.familyId,
      isActive: true,
    },
    include: {
      _count: { select: { redemptions: true } },
    },
    orderBy: { cost: 'asc' },
  })

  return NextResponse.json(rewards)
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  try {
    const json = await request.json()
    const body = rewardSchema.parse(json)
    const { title, description, cost, icon, category } = body

    const reward = await prisma.reward.create({
      data: {
        title,
        description,
        cost,
        icon: icon || 'gift',
        category: category || 'General',
        familyId: auth.familyId,
      },
    })

    return NextResponse.json(reward, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0].message)
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
