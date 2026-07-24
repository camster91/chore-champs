import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'
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

    const reward = await prisma.reward.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!reward) return notFound('Reward not found')

    const parsed = updateRewardSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '))
    }

    const allowed = parsed.data
    const updates: Record<string, unknown> = {}
    if (allowed.title !== undefined) updates.title = allowed.title
    if (allowed.description !== undefined) updates.description = allowed.description
    if (allowed.cost !== undefined) updates.cost = allowed.cost
    if (allowed.icon !== undefined) updates.icon = allowed.icon
    if (allowed.category !== undefined) updates.category = allowed.category
    if (allowed.isActive !== undefined) updates.isActive = allowed.isActive

    const updated = await prisma.reward.update({
      where: { id },
      data: updates,
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
    if (!auth.isOwner) {
      return new Response(JSON.stringify({ error: 'Only the family owner can delete rewards' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
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
