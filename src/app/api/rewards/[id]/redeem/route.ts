import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id: rewardId } = await params
  const body = await request.json()
  const { kidId } = body

  if (!kidId) return badRequest('kidId is required')

  const [reward, kid] = await Promise.all([
    prisma.reward.findFirst({
      where: { id: rewardId, familyId: auth.familyId },
    }),
    prisma.kid.findFirst({
      where: { id: kidId, familyId: auth.familyId },
    }),
  ])

  if (!reward) return notFound('Reward not found')
  if (!kid) return notFound('Kid not found')
  if (kid.points < reward.cost) return badRequest('Not enough points')

  const [redemption, updatedKid] = await prisma.$transaction([
    prisma.redeemedReward.create({
      data: {
        rewardId,
        kidId,
        pointsSpent: reward.cost,
      },
      include: { reward: true },
    }),
    prisma.kid.update({
      where: { id: kidId },
      data: { points: kid.points - reward.cost },
    }),
  ])

  return NextResponse.json({
    redemption,
    kid: updatedKid,
    pointsSpent: reward.cost,
    remainingPoints: updatedKid.points,
  })
}
