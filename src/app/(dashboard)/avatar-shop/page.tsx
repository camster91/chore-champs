'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ShoppingBag, Check, Lock, Loader2 } from 'lucide-react'
import { Card, CardContent, Button, useToast } from '@/components/ui'
import { PointsDisplay } from '@/components/gamification'
import { useKidStore } from '@/stores/kid-store'
import { getPurchasedAvatarItems, unlockAvatarItem, equipAvatarItem } from '@/actions/avatar'

interface AvatarItem {
  id: string
  name: string
  emoji: string
  cost: number
  category: string
}

const AVATAR_ITEMS: AvatarItem[] = [
  { id: 'hat-1', name: 'Top Hat', emoji: '🎩', cost: 50, category: 'hats' },
  { id: 'crown-1', name: 'Crown', emoji: '👑', cost: 100, category: 'hats' },
  { id: 'cap-1', name: 'Cap', emoji: '🧢', cost: 30, category: 'hats' },
  { id: 'glasses-1', name: 'Cool Shades', emoji: '😎', cost: 40, category: 'accessories' },
  { id: 'wings-1', name: 'Angel Wings', emoji: '🪽', cost: 150, category: 'back' },
  { id: 'cape-1', name: 'Hero Cape', emoji: '🦸', cost: 120, category: 'back' },
]

export default function AvatarShopPage() {
  const { currentKid, updateKid } = useKidStore()
  const { toast } = useToast()
  const [purchased, setPurchased] = useState<string[]>([])
  const [equipped, setEquipped] = useState<string | null>(null)
  const [buyingItem, setBuyingItem] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const points = currentKid?.points || 0

  // Load purchased items and points for current kid
  useEffect(() => {
    if (!currentKid) return
    getPurchasedAvatarItems(currentKid.id).then((owned) => {
      setPurchased(owned)
      if (owned.length > 0) setEquipped(owned[0])
    }).catch(() => {
      toast({ title: 'Failed to load shop', variant: 'error' })
    }).finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKid?.id])

  const handlePurchase = async (item: AvatarItem) => {
    if (!currentKid || purchased.includes(item.id)) return

    setBuyingItem(item.id)
    try {
      const result = await unlockAvatarItem(currentKid.id, item.id)
      if (result.success) {
        setPurchased(prev => [...prev, item.id])
        setEquipped(item.id)
        updateKid(currentKid.id, {
          points: result.newPoints,
          avatarId: [item.id, ...purchased].join(',')
        })
        toast({ title: `${item.name} unlocked!`, description: `-${item.cost} points`, variant: 'success' })
      } else {
        toast({ title: result.error || 'Purchase failed', variant: 'error' })
      }
    } catch {
      toast({ title: 'Purchase failed', variant: 'error' })
    } finally {
      setBuyingItem(null)
    }
  }

  const handleEquip = async (itemId: string) => {
    if (!currentKid || !purchased.includes(itemId)) return
    try {
      const result = await equipAvatarItem(currentKid.id, itemId)
      if (result.success) {
        setEquipped(itemId)
        updateKid(currentKid.id, { avatarId: [itemId, ...purchased.filter(i => i !== itemId)].join(',') })
        toast({ title: 'Avatar updated!', variant: 'success' })
      } else {
        toast({ title: result.error || 'Failed to equip', variant: 'error' })
      }
    } catch {
      toast({ title: 'Failed to equip', variant: 'error' })
    }
  }

  if (!currentKid) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Select a kid to customize their avatar!</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Avatar Shop</h1>
              <p className="text-gray-500">Customize {currentKid.name}&apos;s look</p>
            </div>
          </div>
          <PointsDisplay points={points} />
        </div>
      </motion.div>

      {/* Current Avatar */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Current Avatar</p>
            <p className="text-5xl mt-1">
              {equipped
                ? AVATAR_ITEMS.find(i => i.id === equipped)?.emoji || '👧'
                : '👧'}
            </p>
            {equipped && (
              <p className="text-white/80 text-sm mt-1">
                {AVATAR_ITEMS.find(i => i.id === equipped)?.name}
              </p>
            )}
          </div>
          <ShoppingBag className="w-16 h-16 opacity-30" />
        </div>
      </div>

      {/* Shop Items */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {AVATAR_ITEMS.map((item, index) => {
          const isPurchased = purchased.includes(item.id)
          const isEquipped = equipped === item.id
          const canAfford = points >= item.cost

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.03 }}
            >
              <Card className={`h-full ${isEquipped ? 'border-2 border-purple-400 ring-2 ring-purple-100' : isPurchased ? 'border-2 border-green-300' : ''}`}>
                <CardContent className="p-4 text-center flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl ${
                    isPurchased ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {item.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                  </div>

                  {isPurchased ? (
                    <div className="w-full space-y-1.5">
                      {isEquipped ? (
                        <Button size="sm" className="w-full" variant="secondary" disabled>
                          <Check className="w-4 h-4 mr-1" /> Equipped
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full" variant="outline" onClick={() => handleEquip(item.id)}>
                          Equip
                        </Button>
                      )}
                      <p className="text-xs text-green-600 font-medium">Owned</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford || buyingItem === item.id}
                        leftIcon={buyingItem === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                      >
                        {buyingItem === item.id
                          ? 'Buying...'
                          : canAfford
                            ? `Buy - ${item.cost} pts`
                            : `Need ${item.cost} pts`}
                      </Button>
                      {!canAfford && (
                        <p className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" /> {item.cost - points} more needed
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
