'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Gift, Loader2 } from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Modal, Input, CardSkeleton, EmptyState, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { getRewards, createReward, redeemReward } from '@/actions/rewards'
import { initI18n, t as translate } from '@/lib/i18n'

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
  const { toast } = useToast()
  const [rewards, setRewards] = useState<UIReward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newReward, setNewReward] = useState({ title: '', description: '', cost: 50, icon: '🎁', category: 'General' })

  const loadRewards = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getRewards()
      setRewards(data as UIReward[])
    } catch (e) {
      console.error('Failed to load rewards:', e)
      toast({ title: 'Error', description: 'Failed to load rewards. Please try again.', variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    initI18n()
     
    loadRewards()
  }, [loadRewards])

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
      toast({ title: 'Could not create reward', description: 'Please try again.', variant: 'error' })
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
      toast({ title: 'Could not redeem reward', description: 'Please try again.', variant: 'error' })
    }
  }

  if (!currentKid) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{translate('rewards.selectKidToViewRewards')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{translate('rewards.title')}</h1>
          <p className="text-gray-500">{translate('rewards.motivateWithRewards')}</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
          {translate('rewards.addReward')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={translate('rewards.noRewardsYet')}
          description={translate('rewards.motivateWithRewards')}
          action={{
            label: translate('rewards.addReward'),
            onClick: () => setIsAddModalOpen(true),
            icon: <Plus className="w-5 h-5" />,
          }}
        />
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
                    <span className="text-2xl font-bold text-purple-600">{reward.cost} {translate('rewards.pts')}</span>
                    <Button size="sm" onClick={() => handleRedeem(reward)}>
                      {translate('rewards.redeem')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={translate('rewards.createReward')}>
        <div className="space-y-4">
          <Input label={translate('rewards.rewardName')} value={newReward.title} onChange={(e) => setNewReward({ ...newReward, title: e.target.value })} placeholder={translate('rewards.eGExtraScreenTime')} />
          <Input label={translate('common.description')} value={newReward.description} onChange={(e) => setNewReward({ ...newReward, description: e.target.value })} placeholder={translate('rewards.optional')} />
          <Input label={translate('rewards.pointsCost')} type="number" min={1} value={newReward.cost} onChange={(e) => setNewReward({ ...newReward, cost: parseInt(e.target.value) || 1 })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{translate('rewards.icon')}</label>
            <div className="flex gap-2 flex-wrap">
              {rewardIcons.map(icon => (
                <button type="button" key={icon} onClick={() => setNewReward({ ...newReward, icon })} className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all', newReward.icon === icon ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-gray-100 hover:bg-gray-200')}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleCreateReward} disabled={isSubmitting || !newReward.title}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : translate('rewards.createReward')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}