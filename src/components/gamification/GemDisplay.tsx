'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GemDisplayProps {
  gems: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function GemDisplay({ gems, size = 'md', className }: GemDisplayProps) {
  const sizes = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-2',
    lg: 'text-2xl gap-3',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  }

  return (
    <div className={cn('flex items-center font-bold text-cyan-500', sizes[size], className)}>
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        <Sparkles className={cn('fill-cyan-400', iconSizes[size])} />
      </motion.div>
      <span>{gems}</span>
    </div>
  )
}
