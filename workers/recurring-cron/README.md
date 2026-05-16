# Recurring Cron Worker

Cloudflare Worker that nightly invokes `/api/cron/recurring` on the deployed
Next.js app to materialize the next batch of recurring task instances.

## Setup

```bash
cd workers/recurring-cron
npm install
wrangler secret put CRON_SECRET    # same value as the app's CRON_SECRET
wrangler deploy
```

Edit `wrangler.toml` so `APP_BASE_URL` points at the deployed app, or override
it with `wrangler secret put APP_BASE_URL` if it should not live in git.

## Manual run

```bash
curl -X POST https://daily-planner-recurring-cron.<account>.workers.dev/run \
  -H "authorization: Bearer $CRON_SECRET"
```

## Idempotency

The endpoint is idempotent — the unique index on
`(recurringParentId, startDate)` plus a pre-flight existence check guarantee
each occurrence is created at most once even if the cron retries or two
schedulers race.
