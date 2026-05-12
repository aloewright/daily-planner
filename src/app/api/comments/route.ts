import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { comments, users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'


const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function POST(request: NextRequest) {
  const db = getDb()
  try {
    const body = await request.json() as { taskId?: string; body?: string }
    const { taskId, body: commentBody } = body

    if (!taskId || !commentBody?.trim()) {
      return NextResponse.json({ error: 'taskId and body are required' }, { status: 400 })
    }

    const [comment] = await db.insert(comments).values({
      id: createId(),
      taskId,
      body: commentBody.trim(),
      userId: DEMO_USER_ID,
    }).returning()

    // Fetch user info separately (no include in Drizzle)
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, DEMO_USER_ID)).limit(1)

    return NextResponse.json({ ...comment, user: user ?? null }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/comments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
