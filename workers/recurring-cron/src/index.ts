/**
 * Cloudflare Cron Worker that nightly POSTs to the Next.js app's
 * /api/cron/recurring endpoint to materialize the next batch of recurring
 * task instances.
 *
 * The route is idempotent, so a failed run that retries on the next cron tick
 * will not duplicate tasks.
 */

export interface Env {
  /** Base URL of the deployed Next.js app (no trailing slash). */
  APP_BASE_URL: string
  /** Shared secret used as a Bearer token. */
  CRON_SECRET: string
}

const worker = {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runRecurringJob(env))
  },

  // Allow ad-hoc invocation via HTTP for manual backfill / health checks.
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/run') {
      return new Response('Not found', { status: 404 })
    }
    if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }
    const result = await runRecurringJob(env)
    return Response.json(result)
  },
}

export default worker

async function runRecurringJob(env: Env): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!env.APP_BASE_URL || env.APP_BASE_URL.includes('example.invalid')) {
    console.error('APP_BASE_URL is not configured')
    return { ok: false, status: 0, body: 'APP_BASE_URL not configured' }
  }
  if (!env.CRON_SECRET) {
    console.error('CRON_SECRET is not configured')
    return { ok: false, status: 0, body: 'CRON_SECRET not configured' }
  }

  const url = `${env.APP_BASE_URL.replace(/\/$/, '')}/api/cron/recurring`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${env.CRON_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ throughDays: 1 }),
  })

  const text = await res.text()
  let body: unknown = text
  try { body = JSON.parse(text) } catch { /* keep raw text */ }

  if (!res.ok) {
    console.error(`recurring cron failed: ${res.status} ${text}`)
  } else {
    console.log(`recurring cron ok:`, body)
  }
  return { ok: res.ok, status: res.status, body }
}
