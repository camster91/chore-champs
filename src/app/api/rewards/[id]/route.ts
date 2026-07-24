import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound } from '@/lib/auth/helpers'
import { guardMutatingRequest } from '@/lib/security/request-guards'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const blocked = await guardMutatingRequest(request, 'reward-patch', { userId: auth.userId })
    if (blocked) return blocked

    const { id } = await params
    const body = await request.json()

    const reward = await prisma.reward.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!reward) return notFound('Reward not found')

    const allowedFields = ['title', 'description', 'cost', 'icon', 'category', 'isActive']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'cost') {
          const parsed = parseInt(body[field])
          if (!Number.isInteger(parsed) || parsed < 1) {
            return NextResponse.json(
              { error: 'Reward cost must be a positive integer (>= 1)' },
              { status: 400 }
            )
          }
          updates[field] = parsed
        } else {
          updates[field] = body[field]
        }
      }
    }

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const blocked = await guardMutatingRequest(request, 'reward-delete', { userId: auth.userId })
    if (blocked) return blocked

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
