import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import LocationLog from '@/lib/models/LocationLog'
import Workplace from '@/lib/models/Workplace'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const role = (session.user as { role: string }).role
    const userId = (session.user as { id: string }).id

    const query: Record<string, unknown> = {}

    if (role === 'employer') {
      // İşveren: sadece kendi işyerinin loglarını görebilir
      const workplaceId = searchParams.get('workplaceId')
      const employeeId = searchParams.get('employeeId')
      const workplace = workplaceId
        ? await Workplace.findOne({ _id: workplaceId, employerId: userId })
        : await Workplace.findOne({ employerId: userId })

      if (!workplace) return NextResponse.json({ logs: [] })

      query.workplaceId = workplace._id
      query.employeeId = { $in: workplace.employees }
      if (employeeId && workplace.employees.map(String).includes(employeeId)) {
        query.employeeId = employeeId
      }
    } else {
      // İşçi: sadece kendi loglarını görebilir
      query.employeeId = userId
    }

    const logs = await LocationLog.find(query)
      .populate('employeeId', 'name surname')
      .sort({ checkedAt: -1 })
      .limit(limit)

    const formatted = logs.map(log => {
      const emp = log.employeeId as unknown as { _id: string; name: string; surname: string } | null
      return {
        _id: log._id,
        employeeId: emp?._id ?? null,
        employeeName: emp ? `${emp.name} ${emp.surname}` : 'Bilinmiyor',
        isInside: log.isInside,
        checkedAt: log.checkedAt,
        lat: log.lat,
        lng: log.lng,
      }
    })

    return NextResponse.json({ logs: formatted })
  } catch (e) {
    console.error('[location/logs]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
