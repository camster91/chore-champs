import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  getAuthenticatedFamily,
  unauthorized,
  notFound,
  forbidden,
} from '@/lib/auth/helpers'
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
    const parsed = updateChoreSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid chore data' },
        { status: 400 }
      )
    }

    const chore = await prisma.chore.findFirst({
      where: { id, familyId: auth.familyId },
    })

    if (!chore) return notFound('Chore not found')

    const updated = await prisma.chore.update({
      where: { id },
      data: parsed.data,
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
    if (auth.role !== 'OWNER') {
      return forbidden('Only the family owner can delete chores')
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
