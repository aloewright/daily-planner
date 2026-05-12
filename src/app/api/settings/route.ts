import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { userSettings } from '@/lib/schema'
import { eq } from 'drizzle-orm'


const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET() {
  const db = getDb()
  try {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, DEMO_USER_ID)).limit(1)
    if (!settings) {
      const [created] = await db.insert(userSettings).values({ userId: DEMO_USER_ID }).returning()
      return NextResponse.json(created)
    }
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const db = getDb()
  try {
    const body = await request.json() as Record<string, unknown>
    // Allowlist only known UserSettings fields to prevent overwriting protected columns
    const {
      timezone, timeFormat, startOfWeek, workStartTime, workEndTime,
      dailyPlanningTime, weeklyPlanningDay, weeklyPlanningTime,
      automatedDailyPlanning, automatedShutdown, endOfDayMessage,
      countPlannedAsActual, autoSortTasks, aiChannelRecs, aiTimerRecs,
      aiSummaries, onboardingCompleted,
    } = body

    const data = Object.fromEntries(
      Object.entries({
        timezone, timeFormat, startOfWeek, workStartTime, workEndTime,
        dailyPlanningTime, weeklyPlanningDay, weeklyPlanningTime,
        automatedDailyPlanning, automatedShutdown, endOfDayMessage,
        countPlannedAsActual, autoSortTasks, aiChannelRecs, aiTimerRecs,
        aiSummaries, onboardingCompleted,
      }).filter(([, v]) => v !== undefined)
    ) as Partial<typeof userSettings.$inferInsert>

    const [settings] = await db.insert(userSettings)
      .values({ userId: DEMO_USER_ID, ...data })
      .onConflictDoUpdate({ target: userSettings.userId, set: data })
      .returning()

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
