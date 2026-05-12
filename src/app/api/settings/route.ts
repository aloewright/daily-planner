import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET() {
  try {
    const settings = await db.userSettings.findUnique({ where: { userId: DEMO_USER_ID } })
    if (!settings) {
      const created = await db.userSettings.create({ data: { userId: DEMO_USER_ID } })
      return NextResponse.json(created)
    }
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
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
    )

    const settings = await db.userSettings.upsert({
      where: { userId: DEMO_USER_ID },
      update: data,
      create: { userId: DEMO_USER_ID, ...data },
    })
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
