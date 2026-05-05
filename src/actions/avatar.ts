'use server'

export interface AvatarItemDTO {
  id: string
  name: string
  category: string
  imageUrl: string
  unlockCost: number
}

export async function getAvatarItems(): Promise<AvatarItemDTO[]> {
  return [
    { id: 'hat-1', name: 'Top Hat', category: 'hats', imageUrl: '🎩', unlockCost: 50 },
    { id: 'crown-1', name: 'Crown', category: 'hats', imageUrl: '👑', unlockCost: 100 },
    { id: 'cap-1', name: 'Cap', category: 'hats', imageUrl: '🧢', unlockCost: 30 },
    { id: 'glasses-1', name: 'Cool Shades', category: 'accessories', imageUrl: '😎', unlockCost: 40 },
    { id: 'wings-1', name: 'Angel Wings', category: 'back', imageUrl: '🪽', unlockCost: 150 },
    { id: 'cape-1', name: 'Hero Cape', category: 'back', imageUrl: '🦸', unlockCost: 120 },
  ]
}

export async function unlockAvatarItem(kidId: string, itemId: string) {
  return { success: false, error: 'Avatar shop not available' }
}
