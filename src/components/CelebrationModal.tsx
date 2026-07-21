'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Zap } from 'lucide-react'
import type { GamificationData } from '@/hooks/useCelebration'

interface CelebrationModalProps {
  data: GamificationData | null
  onClose: () => void
}

export function CelebrationModal({ data, onClose }: CelebrationModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (data && (data.leveledUp || data.milestone || data.streakBonus > 1)) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 300)
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [data, onClose])

  return (
    <AnimatePresence>
      {visible && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setVisible(false)}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {data.leveledUp && data.newLevel ? (
              <>
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Level Up!
                </h2>
                <p className="text-lg text-gray-600 mb-1">
                  {data.newLevel.icon} {data.newLevel.title}
                </p>
                <p className="text-sm text-gray-500">
                  {data.newLevel.minPoints}+ points required
                </p>
              </>
            ) : data.milestone ? (
              <>
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {data.milestone}
                </h2>
                <p className="text-gray-600">
                  Keep it going!
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  +{data.pointsEarned} Points!
                </h2>
                {data.streakBonus > 1 && (
                  <p className="text-orange-500 font-medium">
                    {data.streakBonus}x streak bonus 🔥
                  </p>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setVisible(false)}
              className="mt-6 px-6 py-2 bg-[var(--color-primary)] text-white rounded-full font-medium hover:opacity-90"
            >
              Awesome!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
