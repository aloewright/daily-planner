import { subDays, startOfDay, isSameDay, format } from 'date-fns'
import { db } from '@/lib/db'

export interface HighlightTask {
  id: string
  title: string
  actualMinutes: number
  channelName: string | null
  channelColor: string | null
  fromCalendar: boolean
}

export interface HighlightDay {
  date: string
  label: string
  tasks: HighlightTask[]
  totalMinutes: number
}

export interface HighlightsRecap {
  generatedAt: string
  rangeStart: string
  rangeEnd: string
  days: HighlightDay[]
  totalTasks: number
  totalMinutes: number
}

// Build a 7-day recap of completed tasks for a user.
// hideTitles: when true, omit task titles entirely (used by the privacy default
// for calendar-derived items). Currently the schema has no calendar-source
// marker; the toggle is kept so the contract is stable when one is added.
export async function buildRecap(opts: {
  userId: string
  hideTitles?: boolean
}): Promise<HighlightsRecap> {
  const today = startOfDay(new Date())
  const start = subDays(today, 7)

  const tasks = await db.task.findMany({
    where: {
      userId: opts.userId,
      archived: false,
      completed: true,
      startDate: { gte: start, lte: new Date() },
    },
    include: { channel: true },
    orderBy: [{ startDate: 'asc' }, { sortOrder: 'asc' }],
  })

  const days: HighlightDay[] = []
  for (let i = 7; i >= 0; i--) {
    const day = subDays(today, i)
    const dayTasks = tasks.filter((t) => t.startDate && isSameDay(t.startDate, day))
    if (dayTasks.length === 0) continue

    const label = isSameDay(day, today)
      ? 'Today'
      : isSameDay(day, subDays(today, 1))
        ? 'Yesterday'
        : format(day, 'EEEE, MMM d')

    const mapped: HighlightTask[] = dayTasks.map((t) => {
      // Future: detect calendar-imported tasks here and force-redact titles.
      const fromCalendar = false
      const redact = opts.hideTitles || fromCalendar
      return {
        id: t.id,
        title: redact ? 'Calendar event' : t.title,
        actualMinutes: t.actualTime || 0,
        channelName: t.channel?.name ?? null,
        channelColor: t.channel?.color ?? null,
        fromCalendar,
      }
    })

    days.push({
      date: format(day, 'yyyy-MM-dd'),
      label,
      tasks: mapped,
      totalMinutes: mapped.reduce((sum, t) => sum + t.actualMinutes, 0),
    })
  }

  const totalTasks = days.reduce((sum, d) => sum + d.tasks.length, 0)
  const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0)

  return {
    generatedAt: new Date().toISOString(),
    rangeStart: format(start, 'yyyy-MM-dd'),
    rangeEnd: format(today, 'yyyy-MM-dd'),
    days,
    totalTasks,
    totalMinutes,
  }
}

export function formatMinutes(m: number): string {
  if (m <= 0) return '0m'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}
