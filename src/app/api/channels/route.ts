import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { channels } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'


export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const session = await createAuth(db).api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id
    const result = await db.select().from(channels).where(eq(channels.userId, userId))
    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/channels]', String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  try {
    const body = await request.json() as { name?: string; color?: string }
    const { name, color } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const [channel] = await db.insert(channels).values({
      id: createId(),
      name: name.trim(),
      color: color ?? '#6b7280',
      userId,
    }).returning()
    return NextResponse.json(channel, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
