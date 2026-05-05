'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Gift,
  Star,
  Sparkles,
  Lock,
  Check,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Modal, Input } from '@/components/ui'
import { PointsDisplay } from '@/components/gamification'
import { Confetti } from '@/components/Confetti'
import { cn } from '@/lib/utils'
import { getRewards, createReward, redeemReward } from '@/actions/rewards'
import { useAudio } from '@/lib/audio-context'
import { trackEvent, EVENTS } from '@/lib/telemetry'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'

interface UIReward {
  id: string
  title: string
  description?: string | null
  cost: number
  icon: string
  category: string
}

const rewardIcons = ['🎮', '🍦', '📺', '🧸', '🍕', '📖', '🏃', '💤', '🎁', '🎬']

export default function RewardsPage() {
  const { currentKid, addPoints } = useKidStore()
  const { play } = useAudio()

  const { data: dbRewards, isLoading: rewardsLoading } = useSWR(
    'rewards',
    () => getRewards(),
    { refreshInterval: 60000 }
  )

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [newReward, setNewReward] = useState({
    title: '',
    description: '',
    cost: 50,
    icon: '🎁',
    category: 'General'
  })

  if (!currentKid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Select a Profile</h2>
        <p className="text-gray-500 mb-6">Choose a kid to see available rewards.</p>
        <Link href="/profile">
          <Button size="lg">Go to Profiles</Button>
        </Link>
      </div>
    )
  }

  const handleCreateReward = async () => {
    if (!newReward.title || !newReward.cost) return
    setIsSubmitting(true)
    try {
      await createReward(newReward)
      mutate('rewards')
      setIsAddModalOpen(false)
      setNewReward({ title: '', description: '', cost: 50, icon: '🎁', category: 'General' })
      play('pop')
    } catch (error) {
      console.error('Failed to create reward:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRedeemReward = async (reward: UIReward) => {
    if (currentKid.points < reward.cost) return

    try {
      await redeemReward(reward.id, currentKid.id)
      addPoints(-reward.cost) // Update local UI immediately
      
      play('tada')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
      
      trackEvent(EVENTS.REWARD_REDEEMED, {
        rewardTitle: reward.title,
        cost: reward.cost,
      })
    } catch (error) {
      console.error('Failed to redeem reward:', error)
    }
  }

  return (
    <div className="space-y-8">
      <Confetti isActive={showConfetti} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rewards Shop</h1>
          <p className="text-gray-500 mt-1">Exchange your hard-earned points for awesome prizes!</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border-2 border-amber-100 flex items-center gap-3">
            <span className="text-sm font-bold text-amber-600 uppercase tracking-wider">Your Balance:</span>
            <PointsDisplay points={currentKid.points} size="lg" />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>Add Reward</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewardsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-48 bg-gray-50" />
          ))
        ) : dbRewards && dbRewards.length > 0 ? (
          dbRewards.map((reward, index) => {
            const canAfford = currentKid.points >= reward.cost
            return (
              <motion.div key={reward.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className={cn('h-full transition-all overflow-hidden flex flex-col', !canAfford && 'opacity-75')}>
                  <CardContent className="p-0 flex-1 flex flex-col">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-4xl">{reward.icon}</div>
                        <Badge variant={canAfford ? 'primary' : 'secondary'} size="lg">{reward.cost} pts</Badge>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{reward.title}</h3>
                      {reward.description && <p className="text-gray-500 text-sm">{reward.description}</p>}
                    </div>
                    <div className="p-4 bg-gray-50 border-t mt-auto">
                      <Button className="w-full" variant={canAfford ? 'primary' : 'secondary'} disabled={!canAfford} onClick={() => handleRedeemReward(reward)} leftIcon={canAfford ? <Star className="w-4 h-4" /> : <Lock className="w-4 h-4" />}>
                        {canAfford ? 'Redeem Now' : 'Keep Earning!'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Gift className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">No Rewards Yet</h2>
            <p className="text-gray-500 mt-2 mb-8 max-w-sm mx-auto">Create some exciting rewards that kids can work towards!</p>
            <Button size="lg" onClick={() => setIsAddModalOpen(true)}>Create Your First Reward</Button>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Reward">
        <div className="space-y-4">
          <Input label="Reward Name" placeholder="e.g. Extra 30 mins Screen Time" value={newReward.title} onChange={e => setNewReward({ ...newReward, title: e.target.value })} />
          <Input label="Description (Optional)" placeholder="What's the prize?" value={newReward.description} onChange={e => setNewReward({ ...newReward, description: e.target.value })} />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Choose an Icon</label>
            <div className="flex flex-wrap gap-2">
              {rewardIcons.map(icon => (
                <button key={icon} onClick={() => setNewReward({ ...newReward, icon })} className={cn('w-10 h-10 text-xl flex items-center justify-center rounded-lg border-2 transition-all', newReward.icon === icon ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-gray-100 hover:border-gray-200')}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <Input label="Point Cost" type="number" value={newReward.cost} onChange={e => setNewReward({ ...newReward, cost: parseInt(e.target.value) })} />

          <Button className="w-full mt-4" onClick={handleCreateReward} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Launch Reward'}</Button>
        </div>
      </Modal>
    </div>
  )
}
