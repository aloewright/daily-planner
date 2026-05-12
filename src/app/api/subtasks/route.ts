import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, title, plannedTime } = body

    if (!taskId || !title?.trim()) {
      return NextResponse.json({ error: 'taskId and title are required' }, { status: 400 })
    }

    const subtask = await db.subtask.create({
      data: {
        taskId,
        title: title.trim(),
        plannedTime: plannedTime ?? 0,
      },
    })

    return NextResponse.json(subtask, { status: 201 })
  } catch (error) {
    console.error('[POST /api/subtasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
