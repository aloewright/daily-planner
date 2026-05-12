import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'edge'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params
  try {
    const existing = await db.task.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const task = await db.task.update({
      where: { id },
      data: {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
      },
      include: { channel: true, subtasks: true, comments: true },
    })
    return NextResponse.json(task)
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    console.error('[POST /api/tasks/[id]/complete]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
