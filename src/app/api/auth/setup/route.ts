import { NextRequest, NextResponse } from 'next/server'
import { createAuth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { users, userSettings } from '@/lib/schema'

export async function POST(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, email, name } = session.user
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  await db.insert(users).values({ id, email, name: name ?? '', createdAt: now, updatedAt: now })
    .onConflictDoNothing()
  await db.insert(userSettings).values({ userId: id })
    .onConflictDoNothing()

  return NextResponse.json({ ok: true })
}
