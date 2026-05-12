import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { subtasks } from '@/lib/schema'
import { createId } from '@paralleldrive/cuid2'


export async function POST(request: NextRequest) {
  const db = getDb()
  try {
    const body = await request.json() as { taskId?: string; title?: string; plannedTime?: number }
    const { taskId, title, plannedTime } = body

    if (!taskId || !title?.trim()) {
      return NextResponse.json({ error: 'taskId and title are required' }, { status: 400 })
    }

    const [subtask] = await db.insert(subtasks).values({
      id: createId(),
      taskId,
      title: title.trim(),
      plannedTime: plannedTime ?? 0,
    }).returning()

    return NextResponse.json(subtask, { status: 201 })
  } catch (error) {
    console.error('[POST /api/subtasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
