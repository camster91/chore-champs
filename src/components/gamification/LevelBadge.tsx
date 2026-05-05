'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LevelBadgeProps {
  level: number
  experience: number
  experienceToNext: number
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  className?: string
}

export function LevelBadge({
  level,
  experience,
  experienceToNext,
  size = 'md',
  showProgress = true,
  className,
}: LevelBadgeProps) {
  const progress = (experience / experienceToNext) * 100

  const sizes = {
    sm: { badge: 'w-10 h-10 text-sm', progress: 'h-1.5' },
    md: { badge: 'w-14 h-14 text-lg', progress: 'h-2' },
    lg: { badge: 'w-20 h-20 text-2xl', progress: 'h-2.5' },
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <motion.div
        className={cn(
          'relative rounded-full flex items-center justify-center font-bold text-white',
          'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]',
          'shadow-lg',
          sizes[size].badge
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>{level}</span>
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-full border-2 border-white/30" />
        <div className="absolute -inset-1 rounded-full border border-[var(--color-primary)]/30" />
      </motion.div>

      {showProgress && (
        <div className="w-full max-w-[80px]">
          <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size].progress)}>
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-center text-gray-500 mt-1">
            {experience}/{experienceToNext} XP
          </p>
        </div>
      )}
    </div>
  )
}
