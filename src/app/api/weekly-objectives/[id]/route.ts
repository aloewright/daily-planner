import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { weeklyObjectives } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  try {
    const { id } = await params
    const body = await request.json() as { text?: string; completed?: boolean }
    const { text, completed } = body

    const data: Partial<typeof weeklyObjectives.$inferInsert> = {}
    if (text !== undefined) data.text = text.trim()
    if (completed !== undefined) data.completed = completed

    const [objective] = await db.update(weeklyObjectives)
      .set(data)
      .where(and(eq(weeklyObjectives.id, id), eq(weeklyObjectives.userId, userId)))
      .returning()

    return NextResponse.json(objective)
  } catch (error) {
    console.error('[PATCH /api/weekly-objectives/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  try {
    const { id } = await params

    await db.delete(weeklyObjectives)
      .where(and(eq(weeklyObjectives.id, id), eq(weeklyObjectives.userId, userId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/weekly-objectives/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
