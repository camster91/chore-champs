import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const rewards = await prisma.reward.findMany({
      where: { familyId: auth.familyId },
      orderBy: { cost: 'asc' },
      take: 100,
    })

    return NextResponse.json(rewards)
  } catch (error) {
    console.error('Rewards API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
