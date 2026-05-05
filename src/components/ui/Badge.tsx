'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
  children?: React.ReactNode
}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  animated,
  children,
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-full'

  const variants = {
    primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    secondary: 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  if (animated) {
    return (
      <motion.span
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {children}
      </motion.span>
    )
  }

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}
