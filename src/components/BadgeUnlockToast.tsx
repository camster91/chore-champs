'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Award } from 'lucide-react'

interface Badge {
  name: string
  icon: string
  description: string
}

export function BadgeUnlockToast({
  badges,
  onDismiss,
}: {
  badges: Badge[]
  onDismiss: () => void
}) {
  return (
    <AnimatePresence>
      {badges.length > 0 && (
        <div className="fixed top-4 right-4 z-[150] space-y-3">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.name}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ delay: i * 0.3, type: 'spring', damping: 15 }}
              onClick={onDismiss}
              className="cursor-pointer bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-4 flex items-center gap-4 min-w-[280px]"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl flex-shrink-0">
                {badge.icon || <Award className="w-6 h-6 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                    Badge Unlocked!
                  </span>
                </div>
                <p className="font-bold text-gray-800">{badge.name}</p>
                <p className="text-sm text-gray-500">{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
