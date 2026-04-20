import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(req: Request) {
  try {
    const { name, surname, email, password } = await req.json()

    if (!name || !surname || !email || !password) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ error: 'Bu e-posta zaten kayıtlı' }, { status: 409 })
    }

    await User.create({ name, surname, email, password, role: 'employee' })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e) {
    console.error('[register]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
