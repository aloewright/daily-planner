import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { dailyPlans } from '@/lib/schema'
import { and, eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

function toSqliteText(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

export async function POST(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  try {
    const { date, obstacles } = (await request.json()) as { date?: string; obstacles?: string }
    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }
    const dateStr = toSqliteText(new Date(date))

    const [existing] = await db
      .select()
      .from(dailyPlans)
      .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, dateStr)))
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(dailyPlans)
        .set({ obstacles: obstacles ?? '' })
        .where(eq(dailyPlans.id, existing.id))
        .returning()
      return NextResponse.json(updated)
    }

    const [created] = await db
      .insert(dailyPlans)
      .values({
        id: createId(),
        userId,
        date: dateStr,
        obstacles: obstacles ?? '',
      })
      .returning()
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('[POST /api/daily-plans]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
