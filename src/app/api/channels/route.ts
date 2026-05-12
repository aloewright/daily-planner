import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'edge'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET() {
  const db = getDb()
  try {
    const channels = await db.channel.findMany({ where: { userId: DEMO_USER_ID } })
    return NextResponse.json(channels)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const channel = await db.channel.create({
      data: {
        name: name.trim(),
        color: color ?? '#6b7280',
        userId: DEMO_USER_ID,
      },
    })
    return NextResponse.json(channel, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
