import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tasks, dailyPlans } from '@/lib/schema'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'


const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

// Convert a JS Date to SQLite text format: "YYYY-MM-DD HH:MM:SS"
function toSqliteText(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

export async function POST(request: NextRequest) {
  const db = getDb()
  try {
    const body = await request.json()
    const { date, intention } = body as { date: string; intention?: string }

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const dayStart = toSqliteText(new Date(date))
    const dayEnd = toSqliteText(new Date(date + 'T23:59:59.999Z'))

    // Find all incomplete tasks for the given date
    const incompleteTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.userId, DEMO_USER_ID),
        eq(tasks.archived, false),
        eq(tasks.completed, false),
        gte(tasks.startDate, dayStart),
        lte(tasks.startDate, dayEnd),
      )
    )

    // Roll each incomplete task to tomorrow
    const tomorrow = new Date(date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = toSqliteText(tomorrow)
    const nowStr = toSqliteText(new Date())

    if (incompleteTasks.length > 0) {
      await db.update(tasks)
        .set({ startDate: tomorrowStr, updatedAt: nowStr })
        .where(inArray(tasks.id, incompleteTasks.map((t) => t.id)))
    }

    // Save intention as tomorrow's daily plan obstacles field (repurposed for intention)
    if (intention?.trim()) {
      const tomorrowDateStr = toSqliteText(tomorrow)
      // Check if a daily plan already exists for this user + date
      const [existingPlan] = await db.select().from(dailyPlans).where(
        and(
          eq(dailyPlans.userId, DEMO_USER_ID),
          eq(dailyPlans.date, tomorrowDateStr),
        )
      ).limit(1)

      if (existingPlan) {
        await db.update(dailyPlans)
          .set({ obstacles: intention.trim() })
          .where(eq(dailyPlans.id, existingPlan.id))
      } else {
        await db.insert(dailyPlans).values({
          id: createId(),
          userId: DEMO_USER_ID,
          date: tomorrowDateStr,
          obstacles: intention.trim(),
        })
      }
    }

    return NextResponse.json({
      rolledOver: incompleteTasks.length,
      date,
    })
  } catch (error) {
    console.error('[POST /api/shutdown]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
