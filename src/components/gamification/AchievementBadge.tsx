'use client'

import { motion } from 'framer-motion'
import {
  Trophy, Star, Flame, Target, Zap,
  Award, Crown, Sparkles, Heart, Medal
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  target: Target,
  zap: Zap,
  award: Award,
  crown: Crown,
  sparkles: Sparkles,
  heart: Heart,
  medal: Medal,
}

interface AchievementBadgeProps {
  name: string
  description: string
  icon: string
  earned?: boolean
  earnedAt?: Date
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

export function AchievementBadge({
  name,
  description,
  icon,
  earned = false,
  earnedAt,
  size = 'md',
  onClick,
  className,
}: AchievementBadgeProps) {
  const Icon = iconMap[icon] || Star

  const sizes = {
    sm: { container: 'p-3', icon: 'w-6 h-6', name: 'text-xs', desc: 'text-xs' },
    md: { container: 'p-4', icon: 'w-8 h-8', name: 'text-sm', desc: 'text-xs' },
    lg: { container: 'p-5', icon: 'w-12 h-12', name: 'text-base', desc: 'text-sm' },
  }

  return (
    <motion.div
      className={cn(
        'relative flex flex-col items-center text-center rounded-2xl transition-all',
        earned
          ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300'
          : 'bg-gray-100 border-2 border-gray-200 opacity-50 grayscale',
        onClick && 'cursor-pointer',
        sizes[size].container,
        className
      )}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
    >
      <motion.div
        className={cn(
          'rounded-full p-3 mb-2',
          earned
            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg'
            : 'bg-gray-300 text-gray-500'
        )}
        animate={earned ? { rotate: [0, -5, 5, 0] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
      >
        <Icon className={sizes[size].icon} />
      </motion.div>

      <h3 className={cn('font-bold text-gray-800', sizes[size].name)}>{name}</h3>
      <p className={cn('text-gray-500 mt-0.5', sizes[size].desc)}>{description}</p>

      {earned && earnedAt && (
        <p className="text-xs text-amber-600 mt-2">
          Earned {earnedAt.toLocaleDateString()}
        </p>
      )}

      {/* Sparkle effect for earned badges */}
      {earned && (
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
        </motion.div>
      )}
    </motion.div>
  )
}
