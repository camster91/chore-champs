'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Star,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Modal, Input } from '@/components/ui'
import { PointsDisplay } from '@/components/gamification'
import { cn } from '@/lib/utils'
import { getRewards, createReward, redeemReward } from '@/actions/rewards'

interface UIReward {
  id: string
  title: string
  description?: string
  cost: number
  icon: string
  category: string
}

const rewardIcons = ['🎮', '📱', '🍦', '🎬', '🛍️', '🎨', '📚', '🎵', '⚽', '🎁']

export default function RewardsPage() {
  const { currentKid, updateKid } = useKidStore()
  const [rewards, setRewards] = useState<UIReward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedReward, setSelectedReward] = useState<UIReward | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [newReward, setNewReward] = useState({
    title: '',
    description: '',
    cost: 50,
    icon: '🎁',
  })

  useEffect(() => {
    async function loadRewards() {
      try {
        const dbRewards = await getRewards()
        const mappedRewards: UIReward[] = dbRewards.map(r => ({
          ...r,
          description: r.description || '',
          category: 'Standard',
        }))
        setRewards(mappedRewards)
      } catch (error) {
        console.error('Failed to load rewards:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadRewards()
  }, [])

  const handleRedeemReward = async (reward: UIReward) => {
    if (!currentKid || currentKid.points < reward.cost) return
    setIsSubmitting(true)
    try {
      await redeemReward(reward.id, currentKid.id)
      updateKid(currentKid.id, { points: currentKid.points - reward.cost })
      setShowSuccess(true)
      setTimeout(() => { setShowSuccess(false); setSelectedReward(null); }, 2000)
    } catch (error) {
      console.error('Failed to redeem reward:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddReward = async () => {
    if (!newReward.title) return
    setIsSubmitting(true)
    try {
      const dbReward = await createReward(newReward)
      setRewards(prev => [...prev, { ...dbReward, description: dbReward.description || '', category: 'Custom' }])
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Failed to add reward:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentKid) return <div className="p-8 text-center">Please select a profile.</div>

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" /></div>

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reward Shop</h1>
          <p className="text-gray-500">Redeem your hard-earned points!</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-white rounded-xl shadow flex items-center gap-2">
            <span className="text-gray-500">Points:</span>
            <PointsDisplay points={currentKid.points} size="md" />
          </div>
          <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setIsAddModalOpen(true)}>Add Reward</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward, index) => {
          const canAfford = currentKid.points >= reward.cost
          return (
            <motion.div key={reward.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className={cn('h-full transition-all', !canAfford && 'opacity-60')} hoverable={canAfford}>
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gray-100">{reward.icon}</div>
                    <Badge variant={canAfford ? 'primary' : 'info'}>{reward.category}</Badge>
                  </div>
                  <h3 className="text-lg font-bold">{reward.title}</h3>
                  <div className="flex-1" />
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1 text-amber-600 font-bold"><Star className="w-5 h-5 fill-amber-500" />{reward.cost}</div>
                    <Button size="sm" disabled={!canAfford} onClick={() => setSelectedReward(reward)}>{canAfford ? 'Redeem' : 'Need More'}</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Modal isOpen={!!selectedReward} onClose={() => setSelectedReward(null)} title={showSuccess ? '' : 'Redeem Reward?'}>
        {showSuccess ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><Check className="w-10 h-10 text-green-500" /></div>
            <h3 className="text-xl font-bold text-green-600">Redeemed!</h3>
          </div>
        ) : selectedReward && (
          <div className="text-center">
            <h3 className="text-xl font-bold">{selectedReward.title}</h3>
            <p className="mt-4 text-gray-500">Confirm redemption for {selectedReward.cost} points?</p>
            <div className="flex gap-4 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedReward(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => handleRedeemReward(selectedReward)} disabled={isSubmitting}>Confirm</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
