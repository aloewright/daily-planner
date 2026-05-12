import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tasks, channels, subtasks, comments } from '@/lib/schema'
import { eq } from 'drizzle-orm'


type Params = { params: Promise<{ id: string }> }

// Convert a JS Date to SQLite text format: "YYYY-MM-DD HH:MM:SS"
function toSqliteText(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

export async function POST(_request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params
  try {
    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const nowStr = toSqliteText(new Date())
    const [updated] = await db.update(tasks).set({
      completed: !existing.completed,
      completedAt: !existing.completed ? nowStr : null,
      updatedAt: nowStr,
    }).where(eq(tasks.id, id)).returning()

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
    console.error('[POST /api/tasks/[id]/complete]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
