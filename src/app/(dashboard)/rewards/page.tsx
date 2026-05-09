'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Gift, Loader2, CheckCircle } from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Modal, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { getRewards, createReward, redeemReward } from '@/actions/rewards'

interface UIReward {
  id: string
  title: string
  description: string | null
  cost: number
  icon: string | null
  category: string | null
}

const rewardIcons = ['🎁', '🎮', '🍦', '🎬', '📚', '🛍️', '🎯', '⭐']

export default function RewardsPage() {
  const { currentKid } = useKidStore()
  const [rewards, setRewards] = useState<UIReward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newReward, setNewReward] = useState({ title: '', description: '', cost: 50, icon: '🎁', category: 'General' })

  useEffect(() => {
    loadRewards()
  }, [])

  const loadRewards = async () => {
    setIsLoading(true)
    try {
      const data = await getRewards()
      setRewards(data as UIReward[])
    } catch (e) {
      console.error('Failed to load rewards:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateReward = async () => {
    if (!newReward.title) return
    setIsSubmitting(true)
    try {
      await createReward({
        title: newReward.title,
        description: newReward.description,
        cost: newReward.cost,
        icon: newReward.icon,
        category: newReward.category
      })
      setIsAddModalOpen(false)
      setNewReward({ title: '', description: '', cost: 50, icon: '🎁', category: 'General' })
      loadRewards()
    } catch (e) {
      console.error('Failed to create reward:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRedeem = async (reward: UIReward) => {
    if (!currentKid) return
    try {
      await redeemReward(reward.id, currentKid.id)
      loadRewards()
    } catch (e) {
      console.error('Failed to redeem reward:', e)
    }
  }

  if (!currentKid) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Select a kid to view rewards</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rewards</h1>
          <p className="text-gray-500">Motivate with rewards they can earn!</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
          Add Reward
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : rewards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No rewards yet! Create some incentives.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => (
            <motion.div key={reward.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl">
                      {reward.icon || '🎁'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{reward.title}</h3>
                      {reward.description && <p className="text-sm text-gray-500">{reward.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-2xl font-bold text-purple-600">{reward.cost} pts</span>
                    <Button size="sm" onClick={() => handleRedeem(reward)}>
                      Redeem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Reward">
        <div className="space-y-4">
          <Input label="Reward Name" value={newReward.title} onChange={(e) => setNewReward({ ...newReward, title: e.target.value })} placeholder="e.g., Extra Screen Time" />
          <Input label="Description" value={newReward.description} onChange={(e) => setNewReward({ ...newReward, description: e.target.value })} placeholder="Optional description" />
          <Input label="Points Cost" type="number" min={1} value={newReward.cost} onChange={(e) => setNewReward({ ...newReward, cost: parseInt(e.target.value) || 1 })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {rewardIcons.map(icon => (
                <button key={icon} onClick={() => setNewReward({ ...newReward, icon })} className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all', newReward.icon === icon ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-gray-100 hover:bg-gray-200')}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleCreateReward} disabled={isSubmitting || !newReward.title}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Reward'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
