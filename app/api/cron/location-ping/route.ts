import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import PushSubscriptionModel from '@/lib/models/PushSubscription'
import User from '@/lib/models/User'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:info@geovardiya.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  await connectDB()

  const employees = await User.find({ role: 'employee' }).select('_id')
  const employeeIds = employees.map((e) => e._id)
  const subs = await PushSubscriptionModel.find({ userId: { $in: employeeIds } })

  let sent = 0
  const stale: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          JSON.stringify({ type: 'PING_LOCATION' })
        )
        sent++
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          stale.push(sub._id.toString())
        }
      }
    })
  )

  if (stale.length > 0) {
    await PushSubscriptionModel.deleteMany({ _id: { $in: stale } })
  }

  return NextResponse.json({ sent, stale: stale.length })
}
