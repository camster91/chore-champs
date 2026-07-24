import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    // Optimization: Removed include for choreAssignments and habitLogs
    // to prevent unbounded O(N) data fetching as user histories grow.
    // The related data is not utilized by clients of this endpoint.
    const kids = await prisma.kid.findMany({
      where: { familyId: auth.familyId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    return NextResponse.json(kids)
  } catch (error) {
    console.error('Kids API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
