import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'edge'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function POST(request: NextRequest) {
  const db = getDb()
  try {
    const body = await request.json()
    const { date, intention } = body as { date: string; intention?: string }

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const dayStart = new Date(date)
    const dayEnd = new Date(date + 'T23:59:59.999Z')

    // Find all incomplete tasks for the given date
    const incompleteTasks = await db.task.findMany({
      where: {
        userId: DEMO_USER_ID,
        archived: false,
        completed: false,
        startDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    })

    // Roll each incomplete task to tomorrow
    const tomorrow = new Date(dayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    await db.task.updateMany({
      where: {
        id: { in: incompleteTasks.map((t) => t.id) },
      },
      data: {
        startDate: tomorrow,
      },
    })

    // Save intention as tomorrow's daily plan obstacles field (repurposed for intention)
    if (intention?.trim()) {
      await db.dailyPlan.upsert({
        where: {
          userId_date: {
            userId: DEMO_USER_ID,
            date: tomorrow,
          },
        },
        update: {
          obstacles: intention.trim(),
        },
        create: {
          userId: DEMO_USER_ID,
          date: tomorrow,
          obstacles: intention.trim(),
        },
      })
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
