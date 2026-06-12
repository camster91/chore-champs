import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound } from '@/lib/auth/helpers'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, props: Props) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const { id } = await props.params

    // Optimization: Removed include for completed choreAssignments
    // to prevent unbounded O(N) data fetching as user histories grow.
    // This relation data is silently discarded by clients.
    const kid = await prisma.kid.findFirst({
      where: { id, familyId: auth.familyId }
    })

    if (!kid) return notFound('Kid not found')

    return NextResponse.json(kid)
  } catch (error) {
    console.error('Kid API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, props: Props) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const { id } = await props.params

    const kid = await prisma.kid.findFirst({
      where: { id, familyId: auth.familyId }
    })
    if (!kid) return notFound('Kid not found')

    // Delete related records first to avoid FK constraint errors
    await prisma.choreAssignment.deleteMany({ where: { kidId: id } })
    await prisma.habitLog.deleteMany({ where: { kidId: id } })
    await prisma.redeemedReward.deleteMany({ where: { kidId: id } })
    await prisma.earnedBadge.deleteMany({ where: { kidId: id } })
    await prisma.plannerItem.deleteMany({ where: { kidId: id } })
    await prisma.kid.delete({ where: { id } })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error) {
    console.error('Kid DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
