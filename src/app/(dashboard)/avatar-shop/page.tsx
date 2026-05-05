'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ShoppingBag, Lock } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'
import { useKidStore } from '@/stores/kid-store'

const AVATAR_ITEMS = [
  { id: 'hat-1', emoji: '🎩', name: 'Top Hat', cost: 50 },
  { id: 'crown-1', emoji: '👑', name: 'Crown', cost: 100 },
  { id: 'cap-1', emoji: '🧢', name: 'Cap', cost: 30 },
  { id: 'glasses-1', emoji: '😎', name: 'Cool Shades', cost: 40 },
  { id: 'wings-1', emoji: '🪽', name: 'Angel Wings', cost: 150 },
  { id: 'cape-1', emoji: '🦸', name: 'Hero Cape', cost: 120 },
]

export default function AvatarShopPage() {
  const { currentKid } = useKidStore()
  const [purchased, setPurchased] = useState<string[]>([])

  if (!currentKid) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Select a kid to customize their avatar!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Avatar Shop</h1>
            <p className="text-gray-500">Customize {currentKid.name}&apos;s look</p>
          </div>
        </div>
      </motion.div>

      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Your Avatar</p>
            <p className="text-3xl font-bold">{currentKid.avatarId || '👧'}</p>
          </div>
          <ShoppingBag className="w-12 h-12 opacity-50" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {AVATAR_ITEMS.map(item => {
          const isPurchased = purchased.includes(item.id)

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
            >
              <Card className={isPurchased ? 'border-2 border-green-400' : ''}>
                <CardContent className="p-4 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl mx-auto mb-3 ${
                    isPurchased ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {item.emoji}
                  </div>
                  <h3 className="font-bold mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {isPurchased ? 'Owned' : `${item.cost} points`}
                  </p>
                  {!isPurchased && (
                    <Button size="sm" className="w-full" disabled>
                      Coming Soon
                    </Button>
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
