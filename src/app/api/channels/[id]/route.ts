import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createAuth } from '@/lib/auth'
import { channels } from '@/lib/schema'
import { and, eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params
  try {
    const body = (await request.json()) as { name?: string; color?: string }
    const data: { name?: string; color?: string } = {}
    if (typeof body.name === 'string') data.name = body.name.trim()
    if (typeof body.color === 'string') data.color = body.color

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const [updated] = await db
      .update(channels)
      .set(data)
      .where(and(eq(channels.id, id), eq(channels.userId, userId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/channels/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const db = getDb()
  const session = await createAuth(db).api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = await params
  try {
    await db.delete(channels).where(and(eq(channels.id, id), eq(channels.userId, userId)))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/channels/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
