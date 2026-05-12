import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { userSettings } from '@/lib/schema'
import { eq } from 'drizzle-orm'


export async function GET(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  try {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
    if (!settings) {
      const [created] = await db.insert(userSettings).values({ userId }).returning()
      return NextResponse.json(created)
    }
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
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
      .values({ userId, ...data })
      .onConflictDoUpdate({ target: userSettings.userId, set: data })
      .returning()

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
