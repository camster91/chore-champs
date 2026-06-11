import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    // Optimization: Removed include for choreAssignments and habitLogs
    // since they are not used by the client when syncing kids store,
    // preventing unbounded data fetching as logs grow over time.
    // This reduces memory usage and speeds up serialization.
    const kids = await prisma.kid.findMany({
      where: { familyId: auth.familyId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(kids)
  } catch (error) {
    console.error('Kids API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
