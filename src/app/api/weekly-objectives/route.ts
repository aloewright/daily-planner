import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { weeklyObjectives } from '@/lib/schema'
import { eq, and, gte, lt, asc } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'


export async function GET(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('weekStart')

  try {
    let result
    if (weekStart) {
      const start = new Date(weekStart)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      // SQLite stores as text "YYYY-MM-DD HH:MM:SS"
      const startStr = start.toISOString().replace('T', ' ').substring(0, 19)
      const endStr = end.toISOString().replace('T', ' ').substring(0, 19)
      result = await db.select().from(weeklyObjectives).where(
        and(
          eq(weeklyObjectives.userId, userId),
          gte(weeklyObjectives.weekStart, startStr),
          lt(weeklyObjectives.weekStart, endStr),
        )
      ).orderBy(asc(weeklyObjectives.createdAt))
    } else {
      result = await db.select().from(weeklyObjectives).where(
        eq(weeklyObjectives.userId, userId)
      ).orderBy(asc(weeklyObjectives.createdAt))
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/weekly-objectives]', error)
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
    const body = await request.json() as { weekStart?: string; text?: string }
    const { weekStart, text } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
    }

    const weekStartStr = new Date(weekStart).toISOString().replace('T', ' ').substring(0, 19)

    const [objective] = await db.insert(weeklyObjectives).values({
      id: createId(),
      text: text.trim(),
      weekStart: weekStartStr,
      userId,
    }).returning()

    return NextResponse.json(objective, { status: 201 })
  } catch (error) {
    console.error('[POST /api/weekly-objectives]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
