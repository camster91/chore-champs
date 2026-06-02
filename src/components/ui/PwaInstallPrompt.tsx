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
          className="fixed bottom-4 right-4 z-50 max-w-xs"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex items-start gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-xs">
                Install ChoreChamps
              </p>
              <div className="flex gap-1.5 mt-1.5">
                {!isIOS && deferredPrompt && (
                  <Button size="sm" onClick={handleInstall} className="text-xs px-2 py-1 h-auto">
                    Install
                  </Button>
                )}
                {isIOS && (
                  <Button size="sm" variant="outline" disabled leftIcon={<Smartphone className="w-3 h-3" />} className="text-xs px-2 py-1 h-auto">
                    Add to Home
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setShowPrompt(false)} className="text-xs px-2 py-1 h-auto">
                  Later
                </Button>
              </div>
            </div>
            <button
              onClick={() => setShowPrompt(false)}
              className="flex-shrink-0 p-0.5 hover:bg-gray-100 rounded"
              aria-label="Dismiss install prompt"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
