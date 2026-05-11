import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export async function GET() {
  try {
    const channels = await db.channel.findMany({ where: { userId: DEMO_USER_ID } })
    return NextResponse.json(channels)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
