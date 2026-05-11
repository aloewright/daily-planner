import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

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

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json(task)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  const {
    title,
    description,
    completed,
    startDate,
    plannedTime,
    actualTime,
    channelId,
    priority,
    scheduledTime,
    notes,
    sortOrder,
  } = body

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (completed !== undefined) data.completed = completed
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
  if (plannedTime !== undefined) data.plannedTime = plannedTime
  if (actualTime !== undefined) data.actualTime = actualTime
  if (channelId !== undefined) data.channelId = channelId
  if (priority !== undefined) data.priority = priority
  if (scheduledTime !== undefined) data.scheduledTime = scheduledTime
  if (notes !== undefined) data.notes = notes
  if (sortOrder !== undefined) data.sortOrder = sortOrder

  const task = await db.task.update({
    where: { id },
    data,
    include: {
      channel: true,
      subtasks: true,
      comments: true,
    },
  })

  return NextResponse.json(task)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params

  await db.task.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
