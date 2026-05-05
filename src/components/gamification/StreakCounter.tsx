'use client'

import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakCounterProps {
  days: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function StreakCounter({
  days,
  size = 'md',
  showLabel = true,
  className,
}: StreakCounterProps) {
  const sizes = {
    sm: { container: 'gap-1', icon: 'w-5 h-5', text: 'text-lg', label: 'text-xs' },
    md: { container: 'gap-1.5', icon: 'w-7 h-7', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'gap-2', icon: 'w-10 h-10', text: 'text-4xl', label: 'text-base' },
  }

  const isActive = days > 0

  return (
    <div className={cn('inline-flex items-center', sizes[size].container, className)}>
      <motion.div
        animate={
          isActive
            ? {
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }
            : {}
        }
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        <Flame
          className={cn(
            sizes[size].icon,
            isActive ? 'text-orange-500 fill-orange-500' : 'text-gray-300'
          )}
        />
      </motion.div>
      <div className="flex flex-col">
        <span
          className={cn(
            'font-bold leading-none',
            sizes[size].text,
            isActive ? 'text-orange-500' : 'text-gray-400'
          )}
        >
          {days}
        </span>
        {showLabel && (
          <span className={cn('text-gray-500', sizes[size].label)}>
            day{days !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
