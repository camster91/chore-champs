import webpush from 'web-push'
import prisma from '@/lib/db'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (!vapidPublicKey || !vapidPrivateKey) {
  // Push notifications are disabled when VAPID keys are not configured
  console.warn('VAPID keys not configured. Push notifications are disabled.')
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@chorechamps.com',
    vapidPublicKey,
    vapidPrivateKey
  )
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, string>
}

export async function sendPushNotification(userId: string, notification: NotificationPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured. Skipping push notification.')
    return
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  })

  for (const sub of subscriptions) {
    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192.png',
        badge: notification.badge || '/icons/badge-72.png',
        data: notification.data
      })

      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: JSON.parse(sub.keys) },
        payload
      )
    } catch (error) {
      console.error('Push notification failed:', error)
      // Remove invalid subscriptions
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? (error as Record<string, unknown>).statusCode
          : undefined
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } })
      }
    }
  }
}

// Create in-app notification and optionally push it
export async function createNotification(
  userId: string,
  notification: Omit<NotificationPayload, 'icon' | 'badge'> & { icon?: string }
) {
  // Store in database
  const dbNotification = await prisma.notification.create({
    data: {
      userId,
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      data: notification.data ? JSON.stringify(notification.data) : null,
    }
  })

  // Send push notification
  await sendPushNotification(userId, {
    ...notification,
    icon: notification.icon || '/icons/icon-192.png'
  })

  return dbNotification
}
