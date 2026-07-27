import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  getAuthenticatedFamily,
  unauthorized,
  notFound,
  forbidden,
} from '@/lib/auth/helpers'
import { updateRewardSchema } from '@/lib/validation/schemas'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const { id } = await params
    const body = await request.json()
    const parsed = updateRewardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid reward data' },
        { status: 400 }
      )
    }

    const reward = await prisma.reward.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!reward) return notFound('Reward not found')

    const updated = await prisma.reward.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Reward PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()
    if (auth.role !== 'OWNER') {
      return forbidden('Only the family owner can delete rewards')
    }

    const { id } = await params

    const reward = await prisma.reward.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!reward) return notFound('Reward not found')

    await prisma.reward.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reward DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
