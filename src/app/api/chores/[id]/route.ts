import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound } from '@/lib/auth/helpers'

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

    const allowedFields = ['title', 'description', 'icon', 'difficulty', 'basePoints', 'recurring', 'timeOfDay', 'isActive']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

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
