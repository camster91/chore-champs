'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface AvatarItemDTO {
  id: string
  name: string
  category: string
  imageUrl: string
  unlockCost: number
}

const AVATAR_ITEMS: AvatarItemDTO[] = [
  { id: 'hat-1', name: 'Top Hat', category: 'hats', imageUrl: '🎩', unlockCost: 50 },
  { id: 'crown-1', name: 'Crown', category: 'hats', imageUrl: '👑', unlockCost: 100 },
  { id: 'cap-1', name: 'Cap', category: 'hats', imageUrl: '🧢', unlockCost: 30 },
  { id: 'glasses-1', name: 'Cool Shades', category: 'accessories', imageUrl: '😎', unlockCost: 40 },
  { id: 'wings-1', name: 'Angel Wings', category: 'back', imageUrl: '🪽', unlockCost: 150 },
  { id: 'cape-1', name: 'Hero Cape', category: 'back', imageUrl: '🦸', unlockCost: 120 },
]

const ALLOWED_ITEM_IDS = new Set(AVATAR_ITEMS.map(i => i.id))

export async function getAvatarItems(): Promise<AvatarItemDTO[]> {
  return AVATAR_ITEMS
}

export async function getPurchasedAvatarItems(kidId: string): Promise<string[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) return []

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
    select: { avatarId: true },
  })
  if (!kid) return []

  const purchased = kid.avatarId
    ? kid.avatarId.split(',').filter(Boolean)
    : []
  return purchased
}

export async function unlockAvatarItem(
  kidId: string,
  itemId: string
): Promise<{ success: boolean; error?: string; newPoints?: number }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ITEM_IDS.has(itemId)) {
    return { success: false, error: 'Item not found' }
  }

  const item = AVATAR_ITEMS.find(i => i.id === itemId)!

  try {
    const result = await prisma.$transaction(async (tx) => {
      const kid = await tx.kid.findFirst({
        where: { id: kidId, familyId: session.user.familyId },
      })
      if (!kid) {
        return { success: false as const, error: 'Kid not found' }
      }

      const owned = kid.avatarId ? kid.avatarId.split(',').filter(Boolean) : []
      if (owned.includes(itemId)) {
        return { success: false as const, error: 'Already owned' }
      }

      const debit = await tx.kid.updateMany({
        where: {
          id: kidId,
          familyId: session.user.familyId,
          points: { gte: item.unlockCost },
        },
        data: {
          points: { decrement: item.unlockCost },
          avatarId: [...owned, itemId].join(','),
        },
      })

      if (debit.count !== 1) {
        return {
          success: false as const,
          error: `Not enough points. Need ${item.unlockCost}`,
        }
      }

      return {
        success: true as const,
        newPoints: kid.points - item.unlockCost,
      }
    })

    if (result.success) {
      revalidatePath('/avatar-shop')
      revalidatePath('/dashboard')
      revalidatePath('/profile')
    }

    return result
  } catch (err) {
    console.error('[unlockAvatarItem]', err)
    return { success: false, error: 'Failed to unlock item' }
  }
}

export async function equipAvatarItem(
  kidId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!ALLOWED_ITEM_IDS.has(itemId) && itemId !== 'default') {
    return { success: false, error: 'Item not found' }
  }

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
  })
  if (!kid) {
    return { success: false, error: 'Kid not found' }
  }

  const owned = kid.avatarId ? kid.avatarId.split(',').filter(Boolean) : []
  if (!owned.includes(itemId)) {
    return { success: false, error: 'Item not owned' }
  }

  const reordered = [itemId, ...owned.filter(i => i !== itemId)]
  await prisma.kid.update({
    where: { id: kidId },
    data: { avatarId: reordered.join(',') },
  })

  revalidatePath('/avatar-shop')
  revalidatePath('/dashboard')
  revalidatePath('/profile')

  return { success: true }
}
