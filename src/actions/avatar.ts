'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getAvatarItems() {
  return await prisma.avatarItem.findMany({
    orderBy: {
      unlockCost: 'asc',
    },
  })
}

export async function unlockAvatarItem(kidId: string, itemId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Verify kid ownership
  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
  })

  if (!kid) {
    throw new Error('Kid not found or unauthorized')
  }

  const item = await prisma.avatarItem.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    throw new Error('Item not found')
  }

  if (kid.points < item.unlockCost) {
    throw new Error('Not enough points')
  }

  // Check if already unlocked (this would require a relation, let's update schema if needed or use a JSON field)
  // For now, let's just deduct points and update the avatarId if it's an equip
  
  await prisma.kid.update({
    where: { id: kidId },
    data: {
      points: { decrement: item.unlockCost },
      avatarId: item.imageUrl, // Assuming imageUrl is the emoji/id for now
    },
  })

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}
