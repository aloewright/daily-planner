import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const existing = await db.task.findUnique({ where: { id } })

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const task = await db.task.update({
    where: { id },
    data: {
      completed: !existing.completed,
      completedAt: !existing.completed ? new Date() : null,
    },
    include: {
      channel: true,
      subtasks: true,
      comments: true,
    },
  })

  return NextResponse.json(task)
}
