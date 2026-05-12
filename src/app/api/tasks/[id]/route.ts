import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tasks, channels, subtasks, comments, users } from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'


type Params = { params: Promise<{ id: string }> }

// Convert a JS Date to SQLite text format: "YYYY-MM-DD HH:MM:SS"
function toSqliteText(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

export async function GET(_request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params
  try {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const [taskChannel, taskSubtasks, taskComments] = await Promise.all([
      task.channelId
        ? db.select().from(channels).where(eq(channels.id, task.channelId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      db.select().from(subtasks).where(eq(subtasks.taskId, id)),
      db.select().from(comments).where(eq(comments.taskId, id)).orderBy(),
    ])

    // Attach user info to comments
    const commentUserIds = [...new Set(taskComments.map((c) => c.userId))]
    const commentUsers = commentUserIds.length > 0
      ? await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
        }).from(users).where(inArray(users.id, commentUserIds))
      : []
    const userMap = new Map(commentUsers.map((u) => [u.id, u]))

    return NextResponse.json({
      ...task,
      channel: taskChannel,
      subtasks: taskSubtasks,
      comments: taskComments.map((c) => ({ ...c, user: userMap.get(c.userId) ?? null })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params
  try {
    const body = await request.json() as {
      title?: string; description?: string; completed?: boolean; startDate?: string;
      plannedTime?: number; actualTime?: number; channelId?: string | null; priority?: string;
      scheduledTime?: string | null; notes?: string; sortOrder?: number; backlogStatus?: string | null;
    }
    const {
      title, description, completed, startDate, plannedTime,
      actualTime, channelId, priority, scheduledTime, notes,
      sortOrder, backlogStatus,
    } = body

    const data: Partial<typeof tasks.$inferInsert> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (completed !== undefined) {
      data.completed = completed
      data.completedAt = completed ? toSqliteText(new Date()) : null
    }
    if (startDate !== undefined) data.startDate = startDate ? toSqliteText(new Date(startDate)) : null
    if (plannedTime !== undefined) data.plannedTime = plannedTime
    if (actualTime !== undefined) data.actualTime = actualTime
    if (channelId !== undefined) data.channelId = channelId
    if (priority !== undefined) data.priority = priority
    if (scheduledTime !== undefined) data.scheduledTime = scheduledTime
    if (notes !== undefined) data.notes = notes
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    if (backlogStatus !== undefined) data.backlogStatus = backlogStatus
    data.updatedAt = toSqliteText(new Date())

    const [updated] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning()
    if (!updated) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const [taskChannel, taskSubtasks, taskComments] = await Promise.all([
      updated.channelId
        ? db.select().from(channels).where(eq(channels.id, updated.channelId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      db.select().from(subtasks).where(eq(subtasks.taskId, id)),
      db.select().from(comments).where(eq(comments.taskId, id)),
    ])

    return NextResponse.json({
      ...updated,
      channel: taskChannel,
      subtasks: taskSubtasks,
      comments: taskComments,
    })
  } catch (error) {
    console.error('[PATCH /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params
  try {
    const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
    if (!deleted) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
