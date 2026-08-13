import webpush from 'web-push'
import prisma from '@/lib/db'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (!vapidPublicKey || !vapidPrivateKey) {
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

function pushErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode
    return typeof code === 'number' ? code : undefined
  }
  return undefined
}

export async function sendPushNotification(userId: string, notification: NotificationPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured. Skipping push notification.')
    return
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    take: 50,
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72.png',
        data: notification.data,
      })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: JSON.parse(sub.keys) },
          payload
        )
      } catch (error) {
        const statusCode = pushErrorStatus(error)
        console.error('Push notification failed', {
          subscriptionId: sub.id,
          statusCode,
        })
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
        throw error
      }
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`Push fan-out: ${failed}/${subscriptions.length} deliveries failed`)
  }
}

export async function createNotification(
  userId: string,
  notification: Omit<NotificationPayload, 'icon' | 'badge'> & { icon?: string }
) {
  const dbNotification = await prisma.notification.create({
    data: {
      userId,
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      data: notification.data ? JSON.stringify(notification.data) : null,
    },
  })

  await sendPushNotification(userId, {
    ...notification,
        icon: notification.icon || '/icons/icon-192x192.png',
  })

  return dbNotification
}
