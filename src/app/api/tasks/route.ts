import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRule } from '@/lib/recurrence'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  // userId param accepted but we use demo user for now
  // const userId = searchParams.get('userId') ?? DEMO_USER_ID

  const backlogStatus = searchParams.get('backlogStatus')

  const where: Record<string, unknown> = {
    userId: DEMO_USER_ID,
    archived: false,
  }

  if (backlogStatus === 'all') {
    where.backlogStatus = { not: null }
  } else if (backlogStatus) {
    where.backlogStatus = backlogStatus
  }

  const completed = searchParams.get('completed')
  if (completed === 'true') where.completed = true
  else if (completed === 'false') where.completed = false

  if (startDate && endDate) {
    where.startDate = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z'),
    }
  }

  // By default, hide series parents from listings — only show concrete
  // instances and one-off tasks. Pass ?includeSeriesParents=true to include them.
  if (searchParams.get('includeSeriesParents') !== 'true') {
    where.OR = [
      { recurring: null },
      { recurringParentId: { not: null } },
    ]
  }

  try {
    const tasks = await db.task.findMany({
      where,
      include: {
        channel: true,
        subtasks: true,
        comments: true,
      },
      orderBy: [{ startDate: 'asc' }, { sortOrder: 'asc' }],
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('[GET /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      startDate,
      channelId,
      plannedTime,
      scheduledTime,
      backlogStatus,
      recurring,
      recurringEndDate,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Validate the recurrence rule early so bad input doesn't reach the DB.
    if (recurring) {
      try {
        parseRule(recurring)
      } catch (err) {
        return NextResponse.json(
          { error: `Invalid recurrence rule: ${err instanceof Error ? err.message : 'unknown'}` },
          { status: 400 },
        )
      }
    }

    const task = await db.task.create({
      data: {
        title: title.trim(),
        userId: DEMO_USER_ID,
        startDate: startDate ? new Date(startDate) : null,
        channelId: channelId ?? null,
        plannedTime: plannedTime ?? 0,
        scheduledTime: scheduledTime ?? null,
        backlogStatus: backlogStatus ?? null,
        recurring: recurring ?? null,
        recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
      },
      include: {
        channel: true,
        subtasks: true,
        comments: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
