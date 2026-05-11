import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  // userId param accepted but we use demo user for now
  // const userId = searchParams.get('userId') ?? DEMO_USER_ID

  const where: Record<string, unknown> = {
    userId: DEMO_USER_ID,
    archived: false,
  }

  if (startDate && endDate) {
    where.startDate = {
      gte: new Date(startDate),
      lte: new Date(endDate + 'T23:59:59.999Z'),
    }
  }

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
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, startDate, channelId, plannedTime, scheduledTime } = body

  const task = await db.task.create({
    data: {
      title,
      userId: DEMO_USER_ID,
      startDate: startDate ? new Date(startDate) : null,
      channelId: channelId ?? null,
      plannedTime: plannedTime ?? 0,
      scheduledTime: scheduledTime ?? null,
    },
    include: {
      channel: true,
      subtasks: true,
      comments: true,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
