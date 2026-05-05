import webpush from 'web-push'
import prisma from '@/lib/db'

// VAPID keys - in production, these should be in environment variables
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'your-private-key'

webpush.setVapidDetails(
  'mailto:admin@chorechamps.com',
  vapidPublicKey,
  vapidPrivateKey
)

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, string>
}

export async function sendPushNotification(userId: string, notification: NotificationPayload) {
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
      if ((error as any).statusCode === 404 || (error as any).statusCode === 410) {
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
