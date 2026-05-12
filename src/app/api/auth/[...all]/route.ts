import { NextRequest } from 'next/server'
import { createAuth } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  return createAuth(getDb()).handler(request)
}

export async function POST(request: NextRequest) {
  return createAuth(getDb()).handler(request)
}
