'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/push-notifications'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }
  }, [])

  return null
}
