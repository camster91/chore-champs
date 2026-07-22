'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Zap } from 'lucide-react'
import type { GamificationData } from '@/hooks/useCelebration'

interface CelebrationModalProps {
  data: GamificationData | null
  onClose: () => void
}

// Auto-dismiss timing — exported so tests can advance timers deterministically.
export const VISIBLE_DURATION_MS = 3500
export const EXIT_ANIMATION_MS = 300

const shouldShow = (data: GamificationData | null): boolean =>
  data !== null && (data.leveledUp || data.milestone !== undefined || data.streakBonus > 1)

/**
 * Renders an animation when a new celebration event arrives.
 *
 * Visibility is *purely derived* from `data`:
 *   - shows when `data` is non-null and matches `shouldShow`
 *   - parent is responsible for clearing `data` via `onClose` (auto-dismiss below)
 *
 * We deliberately do NOT mirror `data` into local state. The parent's
 * `celebrationData` is already a controlled value — duplicating it here
 * would create the cascade-render footgun the new `react-hooks/set-state-in-effect`
 * rule is built to prevent.
 *
 * `key={dataSignature}` ensures the modal remounts (re-runs entrance animation)
 * whenever a new celebration payload arrives, even if it has the same shape as
 * the prior one.
 */
const dataSignature = (data: GamificationData): string =>
  `${data.pointsEarned}|${data.streakBonus}|${data.milestone ?? ''}|${data.leveledUp ? data.newLevel?.level ?? 'x' : 'no'}`

export function CelebrationModal({ data, onClose }: CelebrationModalProps) {
  const visible = shouldShow(data)

  // Auto-dismiss: when a new celebration becomes visible, schedule dismissal.
  // The effect only fires when `visible` flips, not on every render.
  useEffect(() => {
    if (!visible) return
    const exitTimer = setTimeout(onClose, VISIBLE_DURATION_MS + EXIT_ANIMATION_MS)
    return () => clearTimeout(exitTimer)
  }, [visible, onClose])

  return (
    <AnimatePresence>
      {visible && data && (
        <motion.div
          key={dataSignature(data)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
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
              onClick={onClose}
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