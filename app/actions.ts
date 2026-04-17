'use server'

import webpush, { PushSubscription as WebPushSubscription } from 'web-push'

webpush.setVapidDetails(
  'mailto:info@geovardiya.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Production'da bu abonelikler veritabanında saklanmalı
let subscription: WebPushSubscription | null = null

export async function subscribeUser(sub: WebPushSubscription) {
  subscription = sub
  // Örnek DB kaydı: await db.subscriptions.create({ data: sub })
  return { success: true }
}

export async function unsubscribeUser() {
  subscription = null
  // Örnek DB silme: await db.subscriptions.delete({ where: { endpoint: sub.endpoint } })
  return { success: true }
}

export async function sendNotification(message: string) {
  if (!subscription) {
    throw new Error('Aktif abonelik bulunamadı')
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'GeoVardiya',
        body: message,
        icon: '/icon-192x192.png',
      })
    )
    return { success: true }
  } catch (error) {
    console.error('Push bildirim gönderme hatası:', error)
    return { success: false, error: 'Bildirim gönderilemedi' }
  }
}
