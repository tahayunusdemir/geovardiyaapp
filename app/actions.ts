'use server'

import webpush, { PushSubscription as WebPushSubscription } from 'web-push'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import PushSubscriptionModel from '@/lib/models/PushSubscription'

webpush.setVapidDetails(
  'mailto:info@geovardiya.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function subscribeUser(sub: WebPushSubscription) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false }

  await connectDB()
  const userId = (session.user as { id: string }).id

  await PushSubscriptionModel.findOneAndUpdate(
    { userId },
    { subscription: sub },
    { upsert: true }
  )
  return { success: true }
}

export async function unsubscribeUser() {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false }

  await connectDB()
  const userId = (session.user as { id: string }).id
  await PushSubscriptionModel.deleteOne({ userId })
  return { success: true }
}

export async function sendNotification(message: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Oturum bulunamadı')

  await connectDB()
  const userId = (session.user as { id: string }).id
  const record = await PushSubscriptionModel.findOne({ userId })
  if (!record) throw new Error('Abonelik bulunamadı')

  try {
    await webpush.sendNotification(
      record.subscription as webpush.PushSubscription,
      JSON.stringify({ title: 'GeoVardiyaApp', body: message, icon: '/icon-192x192.png' })
    )
    return { success: true }
  } catch {
    return { success: false, error: 'Bildirim gönderilemedi' }
  }
}
