import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'edge'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function POST(request: NextRequest) {
  const db = getDb()
  try {
    const body = await request.json() as { taskId?: string; body?: string }
    const { taskId, body: commentBody } = body

    if (!taskId || !commentBody?.trim()) {
      return NextResponse.json({ error: 'taskId and body are required' }, { status: 400 })
    }

    const comment = await db.comment.create({
      data: {
        taskId,
        body: commentBody.trim(),
        userId: DEMO_USER_ID,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('[POST /api/comments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
