import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET() {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const kids = await prisma.kid.findMany({
    where: { familyId: auth.familyId },
    include: { choreAssignments: true, habitLogs: true },
    orderBy: { createdAt: 'asc' }
  })

  return NextResponse.json(kids)
}
