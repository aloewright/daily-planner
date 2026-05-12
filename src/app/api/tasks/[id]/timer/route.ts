import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tasks } from '@/lib/schema'
import { eq } from 'drizzle-orm'


type Params = { params: Promise<{ id: string }> }

// Convert a JS Date to SQLite text format: "YYYY-MM-DD HH:MM:SS"
function toSqliteText(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

export async function POST(_req: Request, { params }: Params) {
  const db = getDb()
  const { id } = await params
  try {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Toggle timer: set timerStartedAt if null, clear if set
    const [updated] = await db.update(tasks).set({
      timerStartedAt: task.timerStartedAt ? null : toSqliteText(new Date()),
      updatedAt: toSqliteText(new Date()),
    }).where(eq(tasks.id, id)).returning()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
