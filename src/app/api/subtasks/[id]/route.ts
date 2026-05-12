import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { subtasks } from '@/lib/schema'
import { eq } from 'drizzle-orm'


type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params

  try {
    const body = await request.json() as { title?: string; plannedTime?: number; actualTime?: number; completed?: boolean }
    const { title, plannedTime, actualTime, completed } = body

    const data: Partial<typeof subtasks.$inferInsert> = {}
    if (title !== undefined) data.title = title
    if (plannedTime !== undefined) data.plannedTime = plannedTime
    if (actualTime !== undefined) data.actualTime = actualTime
    if (completed !== undefined) data.completed = completed

    const [subtask] = await db.update(subtasks).set(data).where(eq(subtasks.id, id)).returning()

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
    await db.delete(subtasks).where(eq(subtasks.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/subtasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
