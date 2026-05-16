import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

type Decision = 'rollover' | 'backlog' | 'drop'

interface DecisionInput {
  id: string
  decision: Decision
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, intention, decisions } = body as {
      date: string
      intention?: string
      decisions?: DecisionInput[]
    }

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const dayStart = new Date(date)
    const dayEnd = new Date(date + 'T23:59:59.999Z')
    const tomorrow = new Date(dayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find all incomplete tasks for the given date — these are the candidates
    // for per-task decisions. Anything not explicitly classified rolls over by
    // default (preserves the prior behavior).
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
      select: { id: true },
    })

    const allowedIds = new Set(incompleteTasks.map((t) => t.id))
    const decisionMap = new Map<string, Decision>()
    if (Array.isArray(decisions)) {
      for (const d of decisions) {
        if (
          d &&
          typeof d.id === 'string' &&
          allowedIds.has(d.id) &&
          (d.decision === 'rollover' ||
            d.decision === 'backlog' ||
            d.decision === 'drop')
        ) {
          decisionMap.set(d.id, d.decision)
        }
      }
    }

    const rolloverIds: string[] = []
    const backlogIds: string[] = []
    const dropIds: string[] = []
    for (const t of incompleteTasks) {
      const d = decisionMap.get(t.id) ?? 'rollover'
      if (d === 'rollover') rolloverIds.push(t.id)
      else if (d === 'backlog') backlogIds.push(t.id)
      else dropIds.push(t.id)
    }

    if (rolloverIds.length > 0) {
      await db.task.updateMany({
        where: { id: { in: rolloverIds } },
        data: { startDate: tomorrow, backlogStatus: null },
      })
    }

    if (backlogIds.length > 0) {
      await db.task.updateMany({
        where: { id: { in: backlogIds } },
        data: { startDate: null, backlogStatus: 'backlog' },
      })
    }

    if (dropIds.length > 0) {
      await db.task.updateMany({
        where: { id: { in: dropIds } },
        data: { archived: true },
      })
    }

    // Save intention on tomorrow's daily plan (obstacles field repurposed)
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
      date,
      rolledOver: rolloverIds.length,
      backlog: backlogIds.length,
      dropped: dropIds.length,
    })
  } catch (error) {
    console.error('[POST /api/shutdown]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
