import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound } from '@/lib/auth/helpers'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

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
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id } = await params

  const reward = await prisma.reward.findFirst({
    where: { id, familyId: auth.familyId },
  })

  if (!reward) return notFound('Reward not found')

  await prisma.reward.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
