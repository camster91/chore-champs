import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest } from '@/lib/auth/helpers'

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

  const body = await request.json()
  const { title, description, cost, icon, category } = body

  if (!title) return badRequest('Title is required')
  if (!cost || cost < 1) return badRequest('Cost must be at least 1')

  const reward = await prisma.reward.create({
    data: {
      title,
      description,
      cost: parseInt(cost),
      icon: icon || 'gift',
      category: category || 'General',
      familyId: auth.familyId,
    },
  })

  return NextResponse.json(reward, { status: 201 })
}
