'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ShoppingBag,
  Check,
  Loader2,
  Lock,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Modal } from '@/components/ui'
import { PointsDisplay } from '@/components/gamification'
import { cn } from '@/lib/utils'
import { getAvatarItems, unlockAvatarItem } from '@/actions/avatar'

interface AvatarItem {
  id: string
  name: string
  category: string
  imageUrl: string
  unlockCost: number
}

export default function AvatarShopPage() {
  const { currentKid, updateKid } = useKidStore()
  const [items, setItems] = useState<AvatarItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AvatarItem | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    async function loadItems() {
      try {
        const dbItems = await getAvatarItems()
        setItems(dbItems)
      } catch (error) {
        console.error('Failed to load avatar items:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadItems()
  }, [])

  const handleUnlockItem = async (item: AvatarItem) => {
    if (!currentKid || currentKid.points < item.unlockCost) return
    setIsSubmitting(true)
    try {
      await unlockAvatarItem(currentKid.id, item.id)
      updateKid(currentKid.id, { 
        points: currentKid.points - item.unlockCost,
        avatarId: item.imageUrl // Equipped immediately for now
      })
      setShowSuccess(true)
      setTimeout(() => { setShowSuccess(false); setSelectedItem(null); }, 2000)
    } catch (error) {
      console.error('Failed to unlock item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentKid) return <div className="p-8 text-center">Please select a profile.</div>

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" /></div>

  const categories = Array.from(new Set(items.map(i => i.category)))

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Avatar Shop</h1>
          <p className="text-gray-500">Cool gear for your character!</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-white rounded-xl shadow flex items-center gap-2">
            <span className="text-gray-500">Points:</span>
            <PointsDisplay points={currentKid.points} size="md" />
          </div>
        </div>
      </motion.div>

      {categories.map(category => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-bold capitalize">{category}s</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.filter(i => i.category === category).map((item, index) => {
              const canAfford = currentKid.points >= item.unlockCost
              const isEquipped = currentKid.avatarId === item.imageUrl

              return (
                <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                  <Card 
                    className={cn(
                      'relative overflow-hidden cursor-pointer transition-all',
                      isEquipped && 'ring-4 ring-green-500',
                      !canAfford && !isEquipped && 'opacity-70'
                    )}
                    onClick={() => !isEquipped && setSelectedItem(item)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="text-4xl mb-2">{item.imageUrl}</div>
                      <p className="text-sm font-bold truncate w-full">{item.name}</p>
                      
                      {isEquipped ? (
                        <Badge variant="success" size="sm" className="mt-2">Equipped</Badge>
                      ) : (
                        <div className="flex items-center gap-1 mt-2 text-amber-600 font-bold text-xs">
                          <Sparkles className="w-3 h-3" />
                          {item.unlockCost}
                        </div>
                      )}
                      
                      {!canAfford && !isEquipped && (
                        <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                          <Lock className="w-6 h-6 text-gray-400 opacity-50" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No items available in the shop yet.</p>
        </div>
      )}

      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={showSuccess ? '' : 'Unlock Item?'}>
        {showSuccess ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><Check className="w-10 h-10 text-green-500" /></div>
            <h3 className="text-xl font-bold text-green-600">Unlocked!</h3>
          </div>
        ) : selectedItem && (
          <div className="text-center">
            <div className="text-6xl mb-6">{selectedItem.imageUrl}</div>
            <h3 className="text-xl font-bold">{selectedItem.name}</h3>
            <p className="mt-2 text-gray-500">Unlock this item for {selectedItem.unlockCost} points?</p>
            <div className="flex gap-4 mt-8">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedItem(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => handleUnlockItem(selectedItem)} disabled={isSubmitting || currentKid.points < selectedItem.unlockCost}>
                Unlock
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
