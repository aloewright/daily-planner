import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRecurringInstances } from '@/lib/recurringTasks'

/**
 * POST /api/cron/recurring
 *
 * Materializes the next batch of recurring task instances. Intended to be
 * called by a Cloudflare Cron Worker (or any equivalent scheduler) once a day.
 *
 * Auth: Bearer token from CRON_SECRET. The request is rejected if the secret
 * is unset (refuse-by-default) or if the header does not match.
 *
 * Idempotent: safe to call repeatedly. The unique index
 * (recurringParentId, startDate) prevents duplicate occurrences even under
 * concurrent retries.
 *
 * Body (optional JSON):
 *   { "throughDays": number }   // how many days ahead to materialize, default 1
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[POST /api/cron/recurring] CRON_SECRET is not set; refusing')
    return NextResponse.json({ error: 'Cron auth not configured' }, { status: 503 })
  }

  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  if (auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let throughDays = 1
  try {
    if (request.headers.get('content-length') && request.headers.get('content-length') !== '0') {
      const body = await request.json().catch(() => ({}))
      if (typeof body?.throughDays === 'number' && body.throughDays >= 1 && body.throughDays <= 30) {
        throughDays = Math.floor(body.throughDays)
      }
    }
  } catch {
    // Ignore malformed body; default throughDays stays at 1.
  }

  // "Through end of N days from now" — end-of-day UTC.
  const now = new Date()
  const through = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + throughDays,
    23, 59, 59, 999,
  ))

  try {
    const result = await generateRecurringInstances(db, { through })
    return NextResponse.json({ ok: true, through: through.toISOString(), ...result })
  } catch (error) {
    console.error('[POST /api/cron/recurring]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
