/// <reference types="@cloudflare/workers-types" />
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getRequestContext } from '@cloudflare/next-on-pages'

export function getDb(): PrismaClient {
  const { env } = getRequestContext() as unknown as { env: { DB: D1Database } }
  const adapter = new PrismaD1(env.DB)
  return new PrismaClient({ adapter })
}
