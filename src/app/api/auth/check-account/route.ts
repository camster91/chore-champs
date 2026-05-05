import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    const user = await prisma.parent.findUnique({
      where: { email },
      select: { id: true }
    })

    return NextResponse.json({
      hasAccount: !!user,
    })
  } catch (error) {
    return NextResponse.json({ hasAccount: false })
  }
}
