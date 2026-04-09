import { NextResponse } from 'next/server'
import { testDatabaseConnection } from '@/lib/db'

export async function GET() {
  let dbConnected = false

  try {
    dbConnected = await testDatabaseConnection()
  } catch {
    // Connection failed
  }

  const status = dbConnected ? 'ok' : 'error'

  return NextResponse.json(
    { status, timestamp: new Date().toISOString() },
    { status: status === 'ok' ? 200 : 503 }
  )
}
