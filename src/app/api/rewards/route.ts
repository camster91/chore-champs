import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET() {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const rewards = await prisma.reward.findMany({
    where: { familyId: auth.familyId },
    orderBy: { cost: 'asc' }
  })

  return NextResponse.json(rewards)
}
