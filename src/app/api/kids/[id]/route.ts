import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, requireFamilyOwner } from '@/lib/auth/helpers'
import { guardMutatingRequest } from '@/lib/security/request-guards'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, props: Props) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const { id } = await props.params

    const kid = await prisma.kid.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!kid) return notFound('Kid not found')

    return NextResponse.json(kid)
  } catch (error) {
    console.error('Kid API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: Props) {
  try {
    const { auth, error } = await requireFamilyOwner()
    if (error) return error

    const blocked = await guardMutatingRequest(request, 'kid-delete', { userId: auth.userId })
    if (blocked) return blocked

    const { id } = await props.params

    const kid = await prisma.kid.findFirst({
      where: { id, familyId: auth.familyId },
    })
    if (!kid) return notFound('Kid not found')

    await prisma.choreAssignment.deleteMany({ where: { kidId: id } })
    await prisma.habitLog.deleteMany({ where: { kidId: id } })
    await prisma.redemption.deleteMany({ where: { kidId: id } })
    await prisma.earnedBadge.deleteMany({ where: { kidId: id } })
    await prisma.plannerItem.deleteMany({ where: { kidId: id } })
    await prisma.kid.delete({ where: { id } })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error) {
    console.error('Kid DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
