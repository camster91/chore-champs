'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Star, Trophy } from 'lucide-react'
import { Button } from '@/components/ui'
import { useEffect, useRef, useCallback } from 'react'

interface LevelUpModalProps {
  isOpen: boolean
  level: number
  onClose: () => void
}

export function LevelUpModal({ isOpen, level, onClose }: LevelUpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // Focus trap and escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      // Focus the close button after animation starts
      setTimeout(() => {
        const closeBtn = modalRef.current?.querySelector<HTMLElement>('button')
        closeBtn?.focus()
      }, 300)
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      // Restore focus to previously active element
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-up-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated stars background */}
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="absolute"
                    style={{
                      transform: `rotate(${i * 60}deg) translateY(-50px)`,
                    }}
                  >
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
              >
                <Trophy className="w-14 h-14 text-white" />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                <h2 id="level-up-title" className="text-3xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  LEVEL UP!
                </h2>
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>

              <p className="text-gray-500 mb-2">You&apos;ve reached</p>

              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.7 }}
                className="text-5xl font-black text-[var(--color-primary)] mb-4"
              >
                Level {level}
              </motion.p>

              <p className="text-gray-500 mb-6">Keep up the amazing work, ChoreChamp!</p>

              <Button size="lg" className="w-full" onClick={onClose}>
                Awesome!
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
