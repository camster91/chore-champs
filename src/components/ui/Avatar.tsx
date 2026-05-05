'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showBadge?: boolean
  badgeContent?: React.ReactNode
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, size = 'md', showBadge, badgeContent, ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-12 h-12 text-sm',
      lg: 'w-16 h-16 text-base',
      xl: 'w-20 h-20 text-lg',
      '2xl': 'w-28 h-28 text-2xl',
    }

    const badgeSizes = {
      sm: 'w-3 h-3 -right-0.5 -top-0.5',
      md: 'w-4 h-4 -right-0.5 -top-0.5',
      lg: 'w-5 h-5 -right-1 -top-1',
      xl: 'w-6 h-6 -right-1 -top-1',
      '2xl': 'w-8 h-8 -right-1 -top-1',
    }

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    return (
      <div ref={ref} className={cn('relative inline-block', className)} {...props}>
        <div
          className={cn(
            'rounded-full overflow-hidden flex items-center justify-center font-bold',
            'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white',
            sizes[size]
          )}
        >
          {src ? (
            <img src={src} alt={alt || name || 'Avatar'} className="w-full h-full object-cover" />
          ) : (
            <span>{name ? getInitials(name) : '?'}</span>
          )}
        </div>
        {showBadge && (
          <div
            className={cn(
              'absolute rounded-full bg-green-500 border-2 border-white',
              badgeSizes[size]
            )}
          >
            {badgeContent}
          </div>
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

export { Avatar }
