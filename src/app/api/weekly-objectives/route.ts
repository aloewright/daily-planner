import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('weekStart')

  const where: Record<string, unknown> = { userId: DEMO_USER_ID }

  if (weekStart) {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    where.weekStart = { gte: start, lt: end }
  }

  try {
    const objectives = await db.weeklyObjective.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(objectives)
  } catch (error) {
    console.error('[GET /api/weekly-objectives]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { weekStart, text } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }
    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
    }

    const objective = await db.weeklyObjective.create({
      data: {
        text: text.trim(),
        weekStart: new Date(weekStart),
        userId: DEMO_USER_ID,
      },
    })

    return NextResponse.json(objective, { status: 201 })
  } catch (error) {
    console.error('[POST /api/weekly-objectives]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
