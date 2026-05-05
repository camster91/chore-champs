'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Star, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PointsDisplayProps {
  points: number
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  animated?: boolean
  className?: string
}

export function PointsDisplay({
  points,
  size = 'md',
  showIcon = true,
  animated = true,
  className,
}: PointsDisplayProps) {
  const sizes = {
    sm: 'text-sm gap-1',
    md: 'text-lg gap-1.5',
    lg: 'text-2xl gap-2',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center font-bold',
        sizes[size],
        className
      )}
    >
      {showIcon && (
        <motion.div
          animate={animated ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Coins className={cn(iconSizes[size], 'text-amber-500')} />
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        <motion.span
          key={points}
          initial={animated ? { y: -20, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="text-[var(--color-primary)]"
        >
          {points.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

interface PointsEarnedProps {
  amount: number
  onComplete?: () => void
}

export function PointsEarned({ amount, onComplete }: PointsEarnedProps) {
  return (
    <motion.div
      initial={{ scale: 0, y: 0 }}
      animate={{ scale: [0, 1.2, 1], y: -50 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.6 }}
      onAnimationComplete={onComplete}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      <div className="flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-2xl border-2 border-amber-400">
        <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
        <span className="text-3xl font-bold text-amber-600">+{amount}</span>
      </div>
    </motion.div>
  )
}
