'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  Clock,
  Gift,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { getRedemptions, fulfillReward } from '@/actions/rewards'

export default function SettingsPage() {
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRedemptions() {
      try {
        const dbRedemptions = await getRedemptions()
        setRedemptions(dbRedemptions)
      } catch (error) {
        console.error('Failed to load redemptions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadRedemptions()
  }, [])

  const handleFulfill = async (id: string) => {
    try {
      await fulfillReward(id)
      setRedemptions(prev => prev.map(r => r.id === id ? { ...r, fulfilled: true } : r))
    } catch (error) {
      console.error('Failed to fulfill:', error)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div>

  const pending = redemptions.filter(r => !r.fulfilled)

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Parent Dashboard</h1>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6"><Gift className="w-6 h-6 text-amber-500" /><h2 className="text-xl font-bold">Pending Rewards</h2></div>
          <div className="space-y-4">
            {pending.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{r.reward.icon}</div>
                  <div><p className="font-bold">{r.reward.title}</p><p className="text-sm text-gray-500">For {r.kid.name}</p></div>
                </div>
                <Button size="sm" onClick={() => handleFulfill(r.id)}>Fulfill</Button>
              </div>
            ))}
            {pending.length === 0 && <p className="text-center text-gray-500 italic">No rewards to fulfill!</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
