import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'edge'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params

  try {
    const body = await request.json() as { title?: string; plannedTime?: number; actualTime?: number; completed?: boolean }
    const { title, plannedTime, actualTime, completed } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (plannedTime !== undefined) data.plannedTime = plannedTime
    if (actualTime !== undefined) data.actualTime = actualTime
    if (completed !== undefined) data.completed = completed

    const subtask = await db.subtask.update({
      where: { id },
      data,
    })

    return NextResponse.json(subtask)
  } catch (error) {
    console.error('[PATCH /api/subtasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params

  try {
    await db.subtask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/subtasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
