import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET() {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const chores = await prisma.chore.findMany({
    where: { familyId: auth.familyId },
    include: { assignments: { include: { kid: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(chores)
}
