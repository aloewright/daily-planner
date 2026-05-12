import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { comments, users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'


export async function POST(request: NextRequest) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
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
      userId,
    }).returning()

    // Fetch user info separately (no include in Drizzle)
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, userId)).limit(1)

    return NextResponse.json({ ...comment, user: user ?? null }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/comments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
