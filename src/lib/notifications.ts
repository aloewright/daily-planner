import { db } from '@/lib/db'

export type NotificationKind =
  | 'daily_planning_due'
  | 'shutdown_due'
  | 'weekly_planning_due'
  | 'task_overdue'

export interface NotificationPayload {
  title: string
  message: string
  href?: string
  taskId?: string
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoWeekKey(d: Date): string {
  // YYYY-WW (ISO week)
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

function parseHHmm(s: string | null | undefined): { h: number; m: number } | null {
  if (!s) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return { h, m }
}

function timeOfDay(d: Date, hhmm: string | null | undefined): Date | null {
  const parsed = parseHHmm(hhmm)
  if (!parsed) return null
  const r = new Date(d)
  r.setHours(parsed.h, parsed.m, 0, 0)
  return r
}

interface EmitArgs {
  userId: string
  kind: NotificationKind
  dedupeKey: string
  payload: NotificationPayload
}

async function emit({ userId, kind, dedupeKey, payload }: EmitArgs) {
  try {
    await db.notification.upsert({
      where: { userId_kind_dedupeKey: { userId, kind, dedupeKey } },
      update: {},
      create: {
        userId,
        kind,
        dedupeKey,
        payload: JSON.stringify(payload),
      },
    })
  } catch (err) {
    console.error('[notifications.emit]', err)
  }
}

export async function evaluateNotifications(userId: string, now: Date = new Date()) {
  const settings = await db.userSettings.findUnique({ where: { userId } })

  const todayKey = ymd(now)

  // 1. Daily planning due
  const dailyPlanningAt = timeOfDay(now, settings?.dailyPlanningTime ?? '09:00')
  if (dailyPlanningAt && now >= dailyPlanningAt) {
    const existingPlan = await db.dailyPlan.findFirst({
      where: {
        userId,
        date: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      include: { tasks: true },
    })
    const hasPlan = !!existingPlan && existingPlan.tasks.length > 0
    if (!hasPlan) {
      await emit({
        userId,
        kind: 'daily_planning_due',
        dedupeKey: `dpl-${todayKey}`,
        payload: {
          title: 'Daily planning is due',
          message: "It's time to plan your day. Pick today's tasks and intention.",
          href: '/plan',
        },
      })
    }
  }

  // 2. Shutdown due — after workEndTime
  const workEndAt = timeOfDay(now, settings?.workEndTime ?? '17:00')
  if (workEndAt && now >= workEndAt) {
    await emit({
      userId,
      kind: 'shutdown_due',
      dedupeKey: `sd-${todayKey}`,
      payload: {
        title: 'Shutdown ritual',
        message: 'Wrap up the day — roll incomplete tasks and set tomorrow’s intention.',
        href: '/shutdown',
      },
    })
  }

  // 3. Weekly planning due
  const wpDay = settings?.weeklyPlanningDay ?? 'monday'
  const wpIdx = WEEKDAY_INDEX[wpDay.toLowerCase()] ?? 1
  if (now.getDay() === wpIdx) {
    const weeklyAt = timeOfDay(now, settings?.weeklyPlanningTime ?? '09:00')
    if (weeklyAt && now >= weeklyAt) {
      // Compute week start (the planning day) at 00:00
      const weekStart = startOfDay(now)
      const objCount = await db.weeklyObjective.count({
        where: {
          userId,
          weekStart: {
            gte: weekStart,
            lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      })
      if (objCount === 0) {
        await emit({
          userId,
          kind: 'weekly_planning_due',
          dedupeKey: `wpl-${isoWeekKey(now)}`,
          payload: {
            title: 'Weekly planning is due',
            message: 'Set this week’s objectives.',
            href: '/weekly/plan',
          },
        })
      }
    }
  }

  // 4. Task overdue — tasks with dueDate < now, not completed, not archived
  const overdueTasks = await db.task.findMany({
    where: {
      userId,
      archived: false,
      completed: false,
      dueDate: { lt: now, not: null },
    },
    select: { id: true, title: true, dueDate: true },
    take: 50,
  })
  for (const t of overdueTasks) {
    await emit({
      userId,
      kind: 'task_overdue',
      dedupeKey: `to-${t.id}`,
      payload: {
        title: 'Task overdue',
        message: t.title,
        taskId: t.id,
      },
    })
  }
}

export interface NotificationItem {
  id: string
  kind: NotificationKind
  payload: NotificationPayload
  readAt: string | null
  createdAt: string
}

interface RawNotification {
  id: string
  kind: string
  payload: string
  readAt: Date | null
  createdAt: Date
}

export function serializeNotification(n: RawNotification): NotificationItem {
  let payload: NotificationPayload
  try {
    payload = JSON.parse(n.payload) as NotificationPayload
  } catch {
    payload = { title: 'Notification', message: '' }
  }
  return {
    id: n.id,
    kind: n.kind as NotificationKind,
    payload,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }
}
