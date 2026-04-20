import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Workplace from '@/lib/models/Workplace'

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role: string }).role !== 'employer') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    await connectDB()
    const employerId = (session.user as { id: string }).id
    const { employeeId, action } = await req.json()

    const workplace = await Workplace.findOne({ employerId })
    if (!workplace) {
      return NextResponse.json({ error: 'İşyeri bulunamadı' }, { status: 404 })
    }

    if (action === 'add') {
      if (!workplace.employees.includes(employeeId)) {
        workplace.employees.push(employeeId)
      }
    } else if (action === 'remove') {
      workplace.employees = workplace.employees.filter(
        (id) => id.toString() !== employeeId
      )
    }

    await workplace.save()
    await workplace.populate('employees', 'name surname email')
    return NextResponse.json({ workplace })
  } catch (e) {
    console.error('[workplace/employees PATCH]', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
