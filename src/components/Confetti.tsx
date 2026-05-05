'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  size: number
  rotation: number
  duration: number
  shape: 'circle' | 'square' | 'star'
}

const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4']

function generatePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.5,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    duration: 2 + Math.random(),
    shape: (['circle', 'square', 'star'] as const)[Math.floor(Math.random() * 3)],
  }))
}

export function Confetti({
  isActive,
  duration = 2500,
  pieces = 50,
}: {
  isActive: boolean
  duration?: number
  pieces?: number
}) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isActive) {
      const raf = requestAnimationFrame(() => {
        setConfetti(generatePieces(pieces))
        setShow(true)
      })
      const timer = setTimeout(() => setShow(false), duration)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timer)
      }
    }
  }, [isActive, duration, pieces])

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                y: '110vh',
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0],
                scale: [1, 1.2, 0.8],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.shape !== 'star' ? piece.color : 'transparent',
                borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'square' ? '2px' : '0',
              }}
            >
              {piece.shape === 'star' && (
                <span style={{ color: piece.color, fontSize: piece.size * 1.5 }}>*</span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
