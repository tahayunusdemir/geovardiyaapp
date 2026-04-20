import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role: string }).role !== 'employer') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('q') ?? ''
    const q = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const employees = await User.find({
      role: 'employee',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { surname: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('name surname email').limit(20)

    return NextResponse.json({ employees })
  } catch (e) {
    console.error('[employees]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
