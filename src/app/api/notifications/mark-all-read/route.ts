import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function POST() {
  try {
    await db.notification.updateMany({
      where: { userId: DEMO_USER_ID, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/notifications/mark-all-read]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
