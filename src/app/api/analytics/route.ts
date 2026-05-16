import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  differenceInCalendarDays,
  format,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'
const TRENDS_WEEKS = 8
const STREAK_LOOKBACK_DAYS = 365

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const includeWeekends = searchParams.get('includeWeekends') !== 'false'

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }

  try {
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate + 'T23:59:59.999Z')

    const tasks = await db.task.findMany({
      where: {
        userId: DEMO_USER_ID,
        completed: true,
        archived: false,
        completedAt: {
          gte: rangeStart,
          lte: rangeEnd,
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
    const dayMap = new Map<
      string,
      { date: string; totalMinutes: number; byChannel: Map<string, { name: string; color: string; minutes: number }> }
    >()
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

    // ----- Longer-horizon trends, anchored at endDate -----
    const anchor = new Date(endDate + 'T23:59:59.999Z')
    const trendsStart = startOfWeek(subWeeks(anchor, TRENDS_WEEKS - 1), { weekStartsOn: 1 })
    const streakLookbackStart = subDays(anchor, STREAK_LOOKBACK_DAYS)
    const longRangeStart = trendsStart < streakLookbackStart ? trendsStart : streakLookbackStart

    const longRangeTasks = await db.task.findMany({
      where: {
        userId: DEMO_USER_ID,
        completed: true,
        archived: false,
        completedAt: { gte: longRangeStart, lte: anchor },
      },
      include: { channel: true },
      orderBy: { completedAt: 'asc' },
    })

    // Streak: consecutive days (ending at anchor's date) with >= 1 completed task.
    const completionDates = new Set<string>()
    for (const t of longRangeTasks) {
      if (t.completedAt) completionDates.add(format(t.completedAt, 'yyyy-MM-dd'))
    }
    const anchorDayKey = format(anchor, 'yyyy-MM-dd')
    let streak = 0
    // If anchor day has no completion, allow starting from previous day so a viewed past
    // week still surfaces the streak ending on the most recent completion in that window.
    let cursor = anchor
    if (!completionDates.has(anchorDayKey)) {
      cursor = subDays(anchor, 1)
    }
    while (completionDates.has(format(cursor, 'yyyy-MM-dd'))) {
      streak += 1
      cursor = subDays(cursor, 1)
      // safety bound
      if (differenceInCalendarDays(anchor, cursor) > STREAK_LOOKBACK_DAYS) break
    }
    // Longest streak inside the lookback window
    const sortedDays = Array.from(completionDates).sort()
    let longestStreak = 0
    let run = 0
    let prev: Date | null = null
    for (const d of sortedDays) {
      const cur = new Date(d + 'T12:00:00')
      if (prev && differenceInCalendarDays(cur, prev) === 1) {
        run += 1
      } else {
        run = 1
      }
      if (run > longestStreak) longestStreak = run
      prev = cur
    }

    // 8-week channel time series + planned-vs-actual accuracy trend
    type WeekBucket = {
      weekStart: string
      label: string
      totalMinutes: number
      plannedMinutes: number
      byChannel: Map<string, { name: string; color: string; minutes: number }>
    }
    const weekBuckets: WeekBucket[] = []
    for (let i = TRENDS_WEEKS - 1; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(anchor, i), { weekStartsOn: 1 })
      weekBuckets.push({
        weekStart: format(ws, 'yyyy-MM-dd'),
        label: format(ws, 'MMM d'),
        totalMinutes: 0,
        plannedMinutes: 0,
        byChannel: new Map(),
      })
    }
    const bucketIndexByWeekStart = new Map<string, number>()
    weekBuckets.forEach((b, idx) => bucketIndexByWeekStart.set(b.weekStart, idx))

    // Heatmap: dow (0=Mon..6=Sun) × hour (0..23) minutes within trends window
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

    for (const t of longRangeTasks) {
      if (!t.completedAt) continue
      if (t.completedAt < trendsStart) continue
      const ws = startOfWeek(t.completedAt, { weekStartsOn: 1 })
      const key = format(ws, 'yyyy-MM-dd')
      const idx = bucketIndexByWeekStart.get(key)
      if (idx === undefined) continue
      const bucket = weekBuckets[idx]
      bucket.totalMinutes += t.actualTime
      bucket.plannedMinutes += t.plannedTime
      const chName = t.channel?.name ?? 'Uncategorized'
      const chColor = t.channel?.color ?? '#6b7280'
      const ex = bucket.byChannel.get(chName)
      if (ex) ex.minutes += t.actualTime
      else bucket.byChannel.set(chName, { name: chName, color: chColor, minutes: t.actualTime })

      // Map Sun..Sat (0..6) → Mon..Sun (0..6)
      const jsDow = t.completedAt.getDay()
      const monDow = (jsDow + 6) % 7
      const hour = t.completedAt.getHours()
      heatmap[monDow][hour] += t.actualTime
    }

    const weeklyTrends = weekBuckets.map((b) => ({
      weekStart: b.weekStart,
      label: b.label,
      totalMinutes: b.totalMinutes,
      plannedMinutes: b.plannedMinutes,
      byChannel: Array.from(b.byChannel.values()),
    }))

    // Stable union of channel names across trends, with colors
    const trendsChannelMap = new Map<string, { name: string; color: string; totalMinutes: number }>()
    for (const wk of weekBuckets) {
      for (const ch of wk.byChannel.values()) {
        const ex = trendsChannelMap.get(ch.name)
        if (ex) ex.totalMinutes += ch.minutes
        else trendsChannelMap.set(ch.name, { name: ch.name, color: ch.color, totalMinutes: ch.minutes })
      }
    }
    const trendsChannels = Array.from(trendsChannelMap.values()).sort(
      (a, b) => b.totalMinutes - a.totalMinutes
    )

    return NextResponse.json({
      totalMinutes,
      byChannel,
      byDay,
      csvRows,
      trends: {
        anchorDate: format(anchor, 'yyyy-MM-dd'),
        weeks: TRENDS_WEEKS,
        streak: {
          current: streak,
          longest: longestStreak,
          lookbackDays: STREAK_LOOKBACK_DAYS,
        },
        weekly: weeklyTrends,
        channels: trendsChannels,
        heatmap, // [dow=Mon..Sun][hour 0..23] minutes
      },
    })
  } catch (error) {
    console.error('[GET /api/analytics]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

