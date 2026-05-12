import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { channels } from '@/lib/schema'
import { eq } from 'drizzle-orm'


type Params = { params: Promise<{ id: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const db = getDb()
  const { id } = await params
  try {
    await db.delete(channels).where(eq(channels.id, id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
