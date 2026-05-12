import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const task = await db.task.findUnique({
      where: { id },
      include: {
        channel: true,
        subtasks: true,
        comments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await request.json()
    const {
      title, description, completed, startDate, plannedTime,
      actualTime, channelId, priority, scheduledTime, notes,
      sortOrder, backlogStatus,
    } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (completed !== undefined) {
      data.completed = completed
      data.completedAt = completed ? new Date() : null
    }
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (plannedTime !== undefined) data.plannedTime = plannedTime
    if (actualTime !== undefined) data.actualTime = actualTime
    if (channelId !== undefined) data.channelId = channelId
    if (priority !== undefined) data.priority = priority
    if (scheduledTime !== undefined) data.scheduledTime = scheduledTime
    if (notes !== undefined) data.notes = notes
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    if (backlogStatus !== undefined) data.backlogStatus = backlogStatus

    const task = await db.task.update({
      where: { id },
      data,
      include: { channel: true, subtasks: true, comments: true },
    })
    return NextResponse.json(task)
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    console.error('[PATCH /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    console.error('[DELETE /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
