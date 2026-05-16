import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateNotifications, serializeNotification } from '@/lib/notifications'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const skipEval = searchParams.get('skipEval') === '1'

    if (!skipEval) {
      await evaluateNotifications(DEMO_USER_ID)
    }

    const notifications = await db.notification.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(notifications.map(serializeNotification))
  } catch (error) {
    console.error('[GET /api/notifications]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await db.notification.deleteMany({ where: { userId: DEMO_USER_ID } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/notifications]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
