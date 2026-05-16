/**
 * Recurrence rule parsing and occurrence generation.
 *
 * Supported rule grammars (stored in Task.recurring):
 *   - "daily"                    every day
 *   - "daily:N"                  every N days
 *   - "weekly:MON,WED,FRI"       weekly on the listed days (MON..SUN; alt: 1..7 ISO)
 *   - "weekly:MON,WED:N"         every N weeks on the listed days
 *   - "monthly:15"               every month on day-of-month 15
 *   - "monthly:last"             every month on the last day
 *   - "monthly:15:N"             every N months on day-of-month 15
 *   - "rrule:FREQ=...;BYDAY=...;INTERVAL=N"   subset of RFC 5545 RRULE syntax
 *
 * Dates are computed in UTC. The cron caller is responsible for the date window
 * (which day "tomorrow" means in the user's timezone).
 */

export type Frequency = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceRule {
  freq: Frequency
  interval: number
  /** ISO weekday numbers (1=Mon..7=Sun). Required for weekly, optional otherwise. */
  byday?: number[]
  /** Day-of-month for monthly. Negative -1 means "last day". */
  bymonthday?: number
}

const DAY_TOKENS: Record<string, number> = {
  MO: 1, MON: 1,
  TU: 2, TUE: 2,
  WE: 3, WED: 3,
  TH: 4, THU: 4,
  FR: 5, FRI: 5,
  SA: 6, SAT: 6,
  SU: 7, SUN: 7,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
}

function parseDay(token: string): number {
  const t = token.trim().toUpperCase()
  const n = DAY_TOKENS[t]
  if (!n) throw new Error(`Invalid weekday token: ${token}`)
  return n
}

function isoWeekday(d: Date): number {
  // JS getUTCDay: 0=Sun..6=Sat. ISO: 1=Mon..7=Sun.
  const w = d.getUTCDay()
  return w === 0 ? 7 : w
}

export function parseRule(raw: string): RecurrenceRule {
  if (!raw) throw new Error('Empty recurrence rule')
  const trimmed = raw.trim()

  if (trimmed.toLowerCase().startsWith('rrule:')) {
    return parseRRule(trimmed.slice(6))
  }

  const parts = trimmed.split(':').map(p => p.trim()).filter(p => p.length > 0)
  const head = parts[0].toLowerCase()

  if (head === 'daily') {
    const interval = parts[1] ? parseInt(parts[1], 10) : 1
    if (!Number.isFinite(interval) || interval < 1) {
      throw new Error(`Invalid interval: ${parts[1]}`)
    }
    return { freq: 'daily', interval }
  }

  if (head === 'weekly') {
    const days = parts[1]
    if (!days) throw new Error('weekly rule requires day list, e.g. "weekly:MON,WED"')
    const byday = days.split(',').map(parseDay).sort((a, b) => a - b)
    const interval = parts[2] ? parseInt(parts[2], 10) : 1
    if (!Number.isFinite(interval) || interval < 1) {
      throw new Error(`Invalid interval: ${parts[2]}`)
    }
    return { freq: 'weekly', interval, byday }
  }

  if (head === 'monthly') {
    const dom = parts[1]
    if (!dom) throw new Error('monthly rule requires day-of-month, e.g. "monthly:15"')
    let bymonthday: number
    if (dom.toLowerCase() === 'last') {
      bymonthday = -1
    } else {
      bymonthday = parseInt(dom, 10)
      if (!Number.isFinite(bymonthday) || bymonthday < 1 || bymonthday > 31) {
        throw new Error(`Invalid day-of-month: ${dom}`)
      }
    }
    const interval = parts[2] ? parseInt(parts[2], 10) : 1
    if (!Number.isFinite(interval) || interval < 1) {
      throw new Error(`Invalid interval: ${parts[2]}`)
    }
    return { freq: 'monthly', interval, bymonthday }
  }

  throw new Error(`Unrecognized recurrence rule: ${raw}`)
}

function parseRRule(body: string): RecurrenceRule {
  const map = new Map<string, string>()
  for (const segment of body.split(';')) {
    const [k, v] = segment.split('=')
    if (k && v !== undefined) map.set(k.trim().toUpperCase(), v.trim())
  }

  const freqRaw = map.get('FREQ')
  if (!freqRaw) throw new Error('RRULE missing FREQ')
  let freq: Frequency
  switch (freqRaw.toUpperCase()) {
    case 'DAILY': freq = 'daily'; break
    case 'WEEKLY': freq = 'weekly'; break
    case 'MONTHLY': freq = 'monthly'; break
    default: throw new Error(`Unsupported FREQ: ${freqRaw}`)
  }

  const interval = map.has('INTERVAL') ? parseInt(map.get('INTERVAL')!, 10) : 1
  if (!Number.isFinite(interval) || interval < 1) {
    throw new Error(`Invalid INTERVAL: ${map.get('INTERVAL')}`)
  }

  const rule: RecurrenceRule = { freq, interval }

  if (map.has('BYDAY')) {
    rule.byday = map.get('BYDAY')!.split(',').map(parseDay).sort((a, b) => a - b)
  }
  if (map.has('BYMONTHDAY')) {
    const d = parseInt(map.get('BYMONTHDAY')!, 10)
    if (!Number.isFinite(d)) throw new Error(`Invalid BYMONTHDAY: ${map.get('BYMONTHDAY')}`)
    rule.bymonthday = d
  }

  if (rule.freq === 'weekly' && !rule.byday) {
    throw new Error('WEEKLY RRULE requires BYDAY')
  }
  if (rule.freq === 'monthly' && rule.bymonthday === undefined) {
    throw new Error('MONTHLY RRULE requires BYMONTHDAY')
  }

  return rule
}

/** Return the date at UTC midnight for the given Date's calendar day. */
function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addDays(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n))
}

function addMonths(d: Date, n: number, day: number): Date {
  // day === -1 → last day of resulting month
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + n
  if (day === -1) {
    // day 0 of next month → last day of target month
    return new Date(Date.UTC(year, month + 1, 0))
  }
  // Clamp to month length
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const clamped = Math.min(day, lastDay)
  return new Date(Date.UTC(year, month, clamped))
}

/**
 * Compute the next occurrence strictly after `after`, given an anchor (the original
 * series startDate). Returns null if the rule terminates (it doesn't here — rules
 * are open-ended; the caller supplies `endDate` if needed).
 */
export function nextOccurrence(rule: RecurrenceRule, anchor: Date, after: Date): Date {
  const a = utcMidnight(anchor)
  const cursor = utcMidnight(after)

  if (rule.freq === 'daily') {
    // Days since anchor, snapped up to the next interval-aligned day after `after`.
    const diff = Math.floor((cursor.getTime() - a.getTime()) / 86_400_000)
    const next = Math.floor(diff / rule.interval) * rule.interval + rule.interval
    return addDays(a, next)
  }

  if (rule.freq === 'weekly') {
    const days = rule.byday!
    // Walk forward day-by-day; cap search at 7*interval + 7 to be safe.
    const maxSteps = 7 * rule.interval + 7
    for (let i = 1; i <= maxSteps; i++) {
      const candidate = addDays(cursor, i)
      const weekday = isoWeekday(candidate)
      if (!days.includes(weekday)) continue

      if (rule.interval === 1) return candidate

      // Compute the ISO-week index relative to anchor. We count whole weeks
      // between the Monday of the anchor week and the Monday of the candidate
      // week. The anchor-week is week 0; subsequent matching weeks must satisfy
      // (weekIdx % interval) === 0.
      const anchorMonday = addDays(a, -((isoWeekday(a) - 1)))
      const candidateMonday = addDays(candidate, -((isoWeekday(candidate) - 1)))
      const weekIdx = Math.round((candidateMonday.getTime() - anchorMonday.getTime()) / (7 * 86_400_000))
      if (weekIdx % rule.interval === 0) return candidate
    }
    throw new Error('weekly: failed to find next occurrence within search horizon')
  }

  if (rule.freq === 'monthly') {
    const day = rule.bymonthday!
    // Walk monthly cursor forward by `interval` months at a time, starting from anchor.
    // Find the first occurrence strictly after `after`.
    const monthsBetween = (cursor.getUTCFullYear() - a.getUTCFullYear()) * 12 + (cursor.getUTCMonth() - a.getUTCMonth())
    // Start at the next aligned month after anchor.
    let n = Math.max(0, Math.floor(monthsBetween / rule.interval) * rule.interval)
    for (let i = 0; i < 24; i++) {
      const occ = addMonths(a, n, day)
      if (occ.getTime() > cursor.getTime()) return occ
      n += rule.interval
    }
    throw new Error('monthly: failed to find next occurrence within 24 iterations')
  }

  throw new Error(`unknown frequency: ${(rule as { freq: string }).freq}`)
}

/**
 * Return all occurrences in (startExclusive, endInclusive].
 * Caller passes the series anchor and either rule object or a raw string.
 */
export function occurrencesBetween(
  rule: RecurrenceRule | string,
  anchor: Date,
  startExclusive: Date,
  endInclusive: Date,
): Date[] {
  const r = typeof rule === 'string' ? parseRule(rule) : rule
  const result: Date[] = []
  let cursor = startExclusive
  const endMs = endInclusive.getTime()
  // Hard upper bound: 1000 iterations protects against malformed rules.
  for (let i = 0; i < 1000; i++) {
    const next = nextOccurrence(r, anchor, cursor)
    if (next.getTime() > endMs) break
    result.push(next)
    cursor = next
  }
  return result
}
