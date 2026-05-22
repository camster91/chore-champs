'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Settings, ChevronRight } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'
import { useKidStore } from '@/stores/kid-store'
import { initI18n, t as translate } from '@/lib/i18n'
import { useEffect } from 'react'
import { getChores } from '@/actions/chores'

const LEVELS = [
  { level: 1, minPoints: 0, title: 'Beginner', icon: '🌱' },
  { level: 2, minPoints: 50, title: 'Helper', icon: '🤝' },
  { level: 3, minPoints: 150, title: 'Achiever', icon: '⭐' },
  { level: 4, minPoints: 300, title: 'Champion', icon: '🏆' },
  { level: 5, minPoints: 500, title: 'Legend', icon: '👑' },
]

export default function ProfilePage() {
  const { currentKid, setCurrentKid, kids } = useKidStore()
  const [completedChores, setCompletedChores] = useState(0)

  useEffect(() => {
    initI18n()
    async function loadStats() {
      if (!currentKid) return
      try {
        const chores = await getChores()
        const completed = chores.filter((chore) =>
          chore.assignments?.some((a) => a.kidId === currentKid.id && a.status === 'COMPLETED')
        ).length
        setCompletedChores(completed)
      } catch (e) {
        console.error('Failed to load profile stats:', e)
      }
    }
    loadStats()
  }, [currentKid])

  if (!currentKid) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{translate('profile.selectKidToViewProfile')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl">
            {currentKid.avatarId || '🧒'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{currentKid.name}</h1>
            <p className="text-white/80">{currentKid.age} {translate('profile.yearsOld')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{completedChores}</p>
            <p className="text-sm text-white/80">{translate('profile.choresDone')}</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {translate('profile.achievements')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {LEVELS.map(lvl => (
              <div key={lvl.level} className="p-3 rounded-lg flex items-center gap-3 bg-gray-50">
                <span className="text-2xl">{lvl.icon}</span>
                <div>
                  <p className="font-medium">{lvl.title}</p>
                  <p className="text-xs text-gray-500">{lvl.minPoints}+ pts</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {kids.length > 1 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">{translate('profile.switchKid')}</h2>
            <div className="space-y-2">
              {kids.map(kid => (
                <button
                  key={kid.id}
                  onClick={() => setCurrentKid(kid)}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 ${
                    kid.id === currentKid.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl">{kid.avatarId || '🧒'}</span>
                  <span className="font-medium">{kid.name}</span>
                  {kid.id === currentKid.id && <span className="ml-auto text-purple-600 font-medium">{translate('profile.active')}</span>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button className="w-full" onClick={() => window.location.href = '/settings'}>
        <Settings className="w-4 h-4 mr-2" />
        {translate('profile.profileSettings')}
      </Button>
    </div>
  )
}