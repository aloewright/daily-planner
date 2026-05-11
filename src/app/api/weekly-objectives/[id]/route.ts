import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { text, completed } = body

    const data: Record<string, unknown> = {}
    if (text !== undefined) data.text = text.trim()
    if (completed !== undefined) data.completed = completed

    const objective = await db.weeklyObjective.update({
      where: { id, userId: DEMO_USER_ID },
      data,
    })

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
  try {
    const { id } = await params

    await db.weeklyObjective.delete({
      where: { id, userId: DEMO_USER_ID },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/weekly-objectives/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
