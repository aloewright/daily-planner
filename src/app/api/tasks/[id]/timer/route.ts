import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params
  try {
    const task = await db.task.findUnique({ where: { id } })
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Toggle timer: set timerStartedAt if null, clear if set
    const updated = await db.task.update({
      where: { id },
      data: { timerStartedAt: task.timerStartedAt ? null : new Date() },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
