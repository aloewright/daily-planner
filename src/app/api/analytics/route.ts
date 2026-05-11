import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format } from 'date-fns'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const includeWeekends = searchParams.get('includeWeekends') !== 'false'

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }

  try {
    const tasks = await db.task.findMany({
      where: {
        userId: DEMO_USER_ID,
        completed: true,
        archived: false,
        completedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      },
      include: { channel: true },
      orderBy: { completedAt: 'asc' },
    })

    // Filter weekends if needed
    const filtered = includeWeekends
      ? tasks
      : tasks.filter((t) => {
          if (!t.completedAt) return true
          const day = t.completedAt.getDay()
          return day !== 0 && day !== 6
        })

    // Aggregate by channel
    const channelMap = new Map<
      string,
      { channelId: string; name: string; color: string; minutes: number }
    >()
    for (const task of filtered) {
      const key = task.channelId ?? '__none__'
      const name = task.channel?.name ?? 'Uncategorized'
      const color = task.channel?.color ?? '#6b7280'
      const existing = channelMap.get(key)
      if (existing) {
        existing.minutes += task.actualTime
      } else {
        channelMap.set(key, { channelId: key, name, color, minutes: task.actualTime })
      }
    }

    const totalMinutes = filtered.reduce((sum, t) => sum + t.actualTime, 0)
    const byChannel = Array.from(channelMap.values())

    // Aggregate by day
    const dayMap = new Map<string, { date: string; totalMinutes: number; byChannel: Map<string, { name: string; color: string; minutes: number }> }>()
    for (const task of filtered) {
      const date = task.completedAt
        ? format(task.completedAt, 'yyyy-MM-dd')
        : format(new Date(task.updatedAt), 'yyyy-MM-dd')
      const channelName = task.channel?.name ?? 'Uncategorized'
      const channelColor = task.channel?.color ?? '#6b7280'

      if (!dayMap.has(date)) {
        dayMap.set(date, { date, totalMinutes: 0, byChannel: new Map() })
      }
      const day = dayMap.get(date)!
      day.totalMinutes += task.actualTime

      const existing = day.byChannel.get(channelName)
      if (existing) {
        existing.minutes += task.actualTime
      } else {
        day.byChannel.set(channelName, { name: channelName, color: channelColor, minutes: task.actualTime })
      }
    }

    const byDay = Array.from(dayMap.values()).map((d) => ({
      date: d.date,
      totalMinutes: d.totalMinutes,
      byChannel: Array.from(d.byChannel.values()),
    }))

    // CSV data
    const csvRows = filtered.map((t) => ({
      date: t.completedAt ? format(t.completedAt, 'yyyy-MM-dd') : '',
      channel: t.channel?.name ?? 'Uncategorized',
      title: t.title,
      plannedTime: t.plannedTime,
      actualTime: t.actualTime,
    }))

    return NextResponse.json({ totalMinutes, byChannel, byDay, csvRows })
  } catch (error) {
    console.error('[GET /api/analytics]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
