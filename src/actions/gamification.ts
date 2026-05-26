'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function processGamification(kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const kid = await prisma.kid.findUnique({
    where: { id: kidId },
    include: {
      choreAssignments: {
        where: { status: 'COMPLETED' }
      }
    }
  })

  if (!kid) {
    throw new Error('Kid not found')
  }

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  
  return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getEarnedBadges(_kidId: string) {
  return []
}
