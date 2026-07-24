import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'
import { updateChoreSchema } from '@/lib/validation/schemas'
import { guardMutatingRequest } from '@/lib/security/request-guards'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const blocked = await guardMutatingRequest(request, 'chore-patch', { userId: auth.userId })
    if (blocked) return blocked

    const { id } = await params
    const body = await request.json()

    const chore = await prisma.chore.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!chore) return notFound('Chore not found')

    const parsed = updateChoreSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map(i => i.message).join(', '))
    }

    const updated = await prisma.chore.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.basePoints !== undefined && { basePoints: parsed.data.basePoints }),
        ...(parsed.data.difficulty !== undefined && { difficulty: parsed.data.difficulty }),
        ...(parsed.data.recurring !== undefined && { recurring: parsed.data.recurring }),
        ...(parsed.data.timeOfDay !== undefined && { timeOfDay: parsed.data.timeOfDay }),
        ...(parsed.data.icon !== undefined && { icon: parsed.data.icon }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chore PATCH error:', error)
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

    const blocked = await guardMutatingRequest(request, 'chore-delete', { userId: auth.userId })
    if (blocked) return blocked

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
