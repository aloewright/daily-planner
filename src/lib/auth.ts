import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from './schema'

type DB = ReturnType<typeof import('./db').getDb>

export function createAuth(db: DB) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.authUsers,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: ['https://alex.coffee', 'http://localhost:3000'],
    secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-please-change',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  })
}

export type AuthUser = {
  id: string
  email: string
  name: string
}
