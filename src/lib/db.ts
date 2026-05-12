/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import * as schema from './schema'

export function getDb() {
  const { env } = getCloudflareContext() as unknown as { env: { DB: D1Database } }
  return drizzle(env.DB, { schema })
}
