import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import PushSubscriptionModel from '@/lib/models/PushSubscription'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:info@geovardiya.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const MESSAGES: Record<string, { title: string; body: string }> = {
  'gps-lost':             { title: 'GeoVardiyaApp', body: 'GPS sinyali alınamıyor.' },
  'gps-restored':         { title: 'GeoVardiyaApp', body: 'GPS sinyali yeniden alındı.' },
  'connection-restored':  { title: 'GeoVardiyaApp', body: 'İnternet bağlantısı yeniden kuruldu.' },
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { type } = await req.json()
  const notif = MESSAGES[type]
  if (!notif) return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 })

  await connectDB()
  const userId = (session.user as { id: string }).id
  const sub = await PushSubscriptionModel.findOne({ userId })
  if (!sub) return NextResponse.json({ error: 'Abonelik yok' }, { status: 404 })

  try {
    await webpush.sendNotification(
      sub.subscription as webpush.PushSubscription,
      JSON.stringify({ ...notif, icon: '/icon-192x192.png' })
    )
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 410) {
      await PushSubscriptionModel.deleteOne({ userId })
    }
    return NextResponse.json({ error: 'Gönderilemedi' }, { status: 500 })
  }
}
