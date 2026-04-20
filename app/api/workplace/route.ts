import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Workplace from '@/lib/models/Workplace'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role: string }).role !== 'employer') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    await connectDB()
    const employerId = (session.user as { id: string }).id
    const workplace = await Workplace.findOne({ employerId }).populate('employees', 'name surname email')
    return NextResponse.json({ workplace })
  } catch (e) {
    console.error('[workplace GET]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role: string }).role !== 'employer') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    await connectDB()
    const employerId = (session.user as { id: string }).id
    const { name, center, radius } = await req.json()

    if (!name || !center?.lat || !center?.lng || !radius) {
      return NextResponse.json({ error: 'Eksik alan bilgisi' }, { status: 400 })
    }

    const workplace = await Workplace.findOneAndUpdate(
      { employerId },
      { name, center, radius },
      { upsert: true, new: true }
    )

    return NextResponse.json({ workplace })
  } catch (e) {
    console.error('[workplace POST]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
