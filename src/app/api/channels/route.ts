import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { channels } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'


const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET() {
  try {
    const db = getDb()
    const result = await db.select().from(channels).where(eq(channels.userId, DEMO_USER_ID))
    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/channels]', String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const db = getDb()
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
      userId: DEMO_USER_ID,
    }).returning()
    return NextResponse.json(channel, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
