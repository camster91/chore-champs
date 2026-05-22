'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from './Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getIsIOS() {
  return typeof window !== 'undefined' && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
}

function getIsStandalone() {
  return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const isIOS = getIsIOS()
  const isStandalone = getIsStandalone()

  useEffect(() => {
    if (isStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      const t = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(t)
    }

    window.addEventListener('beforeinstallprompt', handler)

    let t: ReturnType<typeof setTimeout> | null = null
    if (isIOS) {
      t = setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (t) clearTimeout(t)
    }
  }, [isIOS, isStandalone])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
    } catch {
      // User dismissed
    }
    setDeferredPrompt(null)
  }

  if (!showPrompt || isStandalone) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                Install ChoreChamps
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isIOS
                  ? 'Tap the Share button then "Add to Home Screen"'
                  : 'Get quick access on your home screen'}
              </p>
              <div className="flex gap-2 mt-3">
                {!isIOS && deferredPrompt && (
                  <Button size="sm" onClick={handleInstall}>
                    Install
                  </Button>
                )}
                {isIOS && (
                  <Button size="sm" variant="outline" disabled leftIcon={<Smartphone className="w-4 h-4" />}>
                    Add to Home Screen
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setShowPrompt(false)}>
                  Maybe later
                </Button>
              </div>
            </div>
            <button
              onClick={() => setShowPrompt(false)}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg"
              aria-label="Dismiss install prompt"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
