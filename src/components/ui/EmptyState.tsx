'use client'

import { motion } from 'framer-motion'
import { Button } from './Button'
import { Card, CardContent } from './Card'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  iconEmoji?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon: Icon,
  iconEmoji,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="mx-auto max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            {Icon ? (
              <Icon className="h-8 w-8 text-gray-400" />
            ) : (
              <span className="text-3xl">{iconEmoji || '📋'}</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-500 max-w-xs">{description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {action && (
              <Button onClick={action.onClick} leftIcon={action.icon}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline">
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
