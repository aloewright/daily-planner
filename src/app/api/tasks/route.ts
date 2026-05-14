import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { tasks, channels, subtasks, comments } from '@/lib/schema'
import { eq, and, gte, lte, isNotNull, asc, inArray } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// Convert a JS Date to SQLite text format used by Prisma: "YYYY-MM-DD HH:MM:SS"
function toSqliteText(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

export async function GET(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const backlogStatus = searchParams.get('backlogStatus')
  const completedParam = searchParams.get('completed')

  const conditions = [
    eq(tasks.userId, userId),
    eq(tasks.archived, false),
  ]

  if (backlogStatus === 'all') {
    conditions.push(isNotNull(tasks.backlogStatus))
  } else if (backlogStatus) {
    conditions.push(eq(tasks.backlogStatus, backlogStatus))
  }

  if (completedParam === 'true') conditions.push(eq(tasks.completed, true))
  else if (completedParam === 'false') conditions.push(eq(tasks.completed, false))

  if (startDate && endDate) {
    const start = toSqliteText(new Date(startDate))
    const end = toSqliteText(new Date(endDate + 'T23:59:59.999Z'))
    conditions.push(gte(tasks.startDate, start))
    conditions.push(lte(tasks.startDate, end))
  }

  try {
    const taskList = await db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.startDate), asc(tasks.sortOrder))

    if (taskList.length === 0) return NextResponse.json([])

    const taskIds = taskList.map((t) => t.id)
    const channelIds = [...new Set(taskList.map((t) => t.channelId).filter(Boolean))] as string[]

    const [channelList, allSubtasks, allComments] = await Promise.all([
      channelIds.length > 0
        ? db.select().from(channels).where(inArray(channels.id, channelIds))
        : Promise.resolve([]),
      db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds)),
      db.select().from(comments).where(inArray(comments.taskId, taskIds)),
    ])

    const channelMap = new Map(channelList.map((c) => [c.id, c]))

    return NextResponse.json(taskList.map((t) => ({
      ...t,
      channel: t.channelId ? (channelMap.get(t.channelId) ?? null) : null,
      subtasks: allSubtasks.filter((s) => s.taskId === t.id),
      comments: allComments.filter((c) => c.taskId === t.id),
    })))
  } catch (error) {
    console.error('[GET /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  try {
    const body = await request.json() as {
      title?: string; startDate?: string; channelId?: string;
      plannedTime?: number; scheduledTime?: string; backlogStatus?: string;
      priority?: string; sortOrder?: number;
    }
    const { title, startDate, channelId, plannedTime, scheduledTime, backlogStatus, priority, sortOrder } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const startDateStr = startDate ? toSqliteText(new Date(startDate)) : null

    const [task] = await db.insert(tasks).values({
      id: createId(),
      title: title.trim(),
      userId,
      startDate: startDateStr,
      channelId: channelId ?? null,
      plannedTime: plannedTime ?? 0,
      scheduledTime: scheduledTime ?? null,
      backlogStatus: backlogStatus ?? null,
      priority: priority ?? 'normal',
      sortOrder: sortOrder ?? 0,
    }).returning()

    // Fetch related channel, subtasks, comments for the response
    const [taskChannel, taskSubtasks, taskComments] = await Promise.all([
      task.channelId
        ? db.select().from(channels).where(eq(channels.id, task.channelId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
      db.select().from(subtasks).where(eq(subtasks.taskId, task.id)),
      db.select().from(comments).where(eq(comments.taskId, task.id)),
    ])

    return NextResponse.json({
      ...task,
      channel: taskChannel,
      subtasks: taskSubtasks,
      comments: taskComments,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
