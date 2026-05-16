import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serializeNotification } from '@/lib/notifications'

type Params = { params: Promise<{ id: string }> }

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const { read } = body as { read?: boolean }

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing || existing.userId !== DEMO_USER_ID) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await db.notification.update({
      where: { id },
      data: { readAt: read === false ? null : new Date() },
    })
    return NextResponse.json(serializeNotification(updated))
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    console.error('[PATCH /api/notifications/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing || existing.userId !== DEMO_USER_ID) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.notification.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    console.error('[DELETE /api/notifications/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
