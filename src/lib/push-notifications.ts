'use client'

// Check if service workers are supported
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// Get VAPID public key from env
export function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    console.log('Push notifications not supported')
    return null
  }

  try {
    const existingReg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (existingReg) {
      console.log('Service worker already registered, using existing registration')
      return existingReg
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready

    return registration
  } catch (error) {
    // Service worker registration may fail due to redirect/disallowed contexts
    // (e.g. source behind a redirect — SecurityError code 18). Fail silently.
    console.warn('Service worker registration failed, skipping:', error instanceof Error ? error.message : String(error))
    return null
  }
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await registerServiceWorker()
  if (!registration) return null

  const vapidKey = getVapidPublicKey()
  if (!vapidKey) {
    console.warn('VAPID public key not configured. Push notifications are disabled.')
    return null
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey
    })

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON())
    })

    return subscription
  } catch (error) {
    console.error('Push subscription failed:', error)
    return null
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  
  if (subscription) {
    await subscription.unsubscribe()
    
    // Remove from server
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    })
  }
  
  return true
}

// Check if user is already subscribed
export async function isSubscribed(): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return await Notification.requestPermission()
}

// Send test notification (for debugging)
export async function sendTestNotification(): Promise<void> {
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    console.log('Notification permission not granted')
    return
  }

  new Notification('ChoreChamps', {
    body: 'Test notification! 🎉',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png'
  })
}
