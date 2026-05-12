import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { weeklyObjectives } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'


const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json() as { text?: string; completed?: boolean }
    const { text, completed } = body

    const data: Partial<typeof weeklyObjectives.$inferInsert> = {}
    if (text !== undefined) data.text = text.trim()
    if (completed !== undefined) data.completed = completed

    const [objective] = await db.update(weeklyObjectives)
      .set(data)
      .where(and(eq(weeklyObjectives.id, id), eq(weeklyObjectives.userId, DEMO_USER_ID)))
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
  try {
    const { id } = await params

    await db.delete(weeklyObjectives)
      .where(and(eq(weeklyObjectives.id, id), eq(weeklyObjectives.userId, DEMO_USER_ID)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/weekly-objectives/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
