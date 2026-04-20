import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Workplace from '@/lib/models/Workplace'
import LocationLog from '@/lib/models/LocationLog'
import PushSubscriptionModel from '@/lib/models/PushSubscription'
import { haversineDistance } from '@/lib/haversine'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:info@geovardiya.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role: string }).role !== 'employee') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    // SW tarafından tetiklendiyse bildirim göndermez — SW kendi gösterir
    const url = new URL(req.url)
    const fromSW = url.searchParams.get('sw') === '1'

    const employeeId = (session.user as { id: string }).id
    const { lat, lng } = await req.json()
    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'Eksik veri' }, { status: 400 })
    }

    await connectDB()

    const workplace = await Workplace.findOne({ employees: employeeId }).populate('employerId', 'name')
    if (!workplace) {
      return NextResponse.json({ error: 'İşyeri bulunamadı' }, { status: 404 })
    }

    const distance = haversineDistance(lat, lng, workplace.center.lat, workplace.center.lng)
    const isInside = distance <= workplace.radius

    // Önceki durumu al — geçiş tespiti için
    const prevLog = await LocationLog.findOne({ employeeId, workplaceId: workplace._id })
      .sort({ checkedAt: -1 })
      .select('isInside')

    await LocationLog.create({
      employeeId,
      workplaceId: workplace._id,
      lat,
      lng,
      isInside,
      checkedAt: new Date(),
    })

    const wasInside = prevLog?.isInside ?? null
    const stateChanged = wasInside !== null && wasInside !== isInside

    // SW çağırıyorsa bildirim göndermez — SW response'dan kendi gösterir
    if (!fromSW && stateChanged) {
      const employerId = workplace.employerId._id.toString()
      const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

      if (isInside) {
        await Promise.all([
          sendPushToUser(employeeId, { title: 'GeoVardiyaApp', body: `${now} — Çalışma alanına girdiniz.` }),
          sendPushToUser(employerId, { title: 'GeoVardiyaApp', body: `${now} — İşçi çalışma alanına girdi.` }),
        ])
      } else {
        await Promise.all([
          sendPushToUser(employeeId, { title: 'GeoVardiyaApp — Uyarı', body: `${now} — Çalışma alanı dışındasınız. (${Math.round(distance)}m)` }),
          sendPushToUser(employerId, { title: 'GeoVardiyaApp — Uyarı', body: `${now} — İşçi çalışma alanı dışına çıktı. Mesafe: ${Math.round(distance)}m` }),
        ])
      }
    }

    return NextResponse.json({ isInside, distance: Math.round(distance), workplaceName: workplace.name })
  } catch (e) {
    console.error('[location/check]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

async function sendPushToUser(userId: string, payload: { title: string; body: string }) {
  const sub = await PushSubscriptionModel.findOne({ userId })
  if (!sub) return
  try {
    await webpush.sendNotification(
      sub.subscription as webpush.PushSubscription,
      JSON.stringify({ ...payload, icon: '/icon-192x192.png' })
    )
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 410) {
      await PushSubscriptionModel.deleteOne({ userId })
    }
  }
}
