import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'
import { updateChoreSchema } from '@/lib/validation/schemas'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const { id } = await params
    const body = await request.json()

    const chore = await prisma.chore.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!chore) return notFound('Chore not found')

    const parsed = updateChoreSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '))
    }

    const allowed = parsed.data
    const updates: Record<string, unknown> = {}
    if (allowed.title !== undefined) updates.title = allowed.title
    if (allowed.description !== undefined) updates.description = allowed.description
    if (allowed.icon !== undefined) updates.icon = allowed.icon
    if (allowed.difficulty !== undefined) updates.difficulty = allowed.difficulty
    if (allowed.basePoints !== undefined) updates.basePoints = allowed.basePoints
    if (allowed.recurring !== undefined) updates.recurring = allowed.recurring
    if (allowed.timeOfDay !== undefined) updates.timeOfDay = allowed.timeOfDay
    if (allowed.isActive !== undefined) updates.isActive = allowed.isActive

    const updated = await prisma.chore.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chore PATCH error:', error)
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
      return new Response(JSON.stringify({ error: 'Only the family owner can delete chores' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { id } = await params

    const chore = await prisma.chore.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!chore) return notFound('Chore not found')

    await prisma.chore.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chore DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
