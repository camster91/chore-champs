import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Simple DB connectivity check
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', db: 'connected', timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { status: 'error', db: 'disconnected', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
