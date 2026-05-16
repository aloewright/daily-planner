import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function randomId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

interface SharedR2Bucket {
  put(
    key: string,
    body: ArrayBuffer | ReadableStream | string,
    opts?: {
      httpMetadata?: { contentType?: string }
      customMetadata?: Record<string, string>
    },
  ): Promise<unknown>
}

async function getR2Bucket(): Promise<SharedR2Bucket | null> {
  try {
    const mod = await import('@opennextjs/cloudflare')
    const ctx = await mod.getCloudflareContext({ async: true })
    const env = ctx.env as unknown as { HIGHLIGHTS_BUCKET?: SharedR2Bucket }
    return env.HIGHLIGHTS_BUCKET ?? null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const hideTitles = body?.hideTitles === true

    const bucket = await getR2Bucket()
    if (!bucket) {
      return NextResponse.json(
        { unavailable: true, reason: 'R2 bucket not configured' },
        { status: 503 },
      )
    }

    const origin = new URL(request.url).origin
    const ogUrl = `${origin}/api/highlights/og?hideTitles=${hideTitles ? 'true' : 'false'}`
    const ogRes = await fetch(ogUrl)
    if (!ogRes.ok) {
      return NextResponse.json({ error: 'Failed to render image' }, { status: 502 })
    }
    const png = await ogRes.arrayBuffer()

    const id = randomId()
    const expiresAt = Date.now() + TTL_SECONDS * 1000
    await bucket.put(`highlights/${id}.png`, png, {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: {
        expiresAt: String(expiresAt),
        hideTitles: hideTitles ? 'true' : 'false',
      },
    })

    return NextResponse.json({
      id,
      url: `${origin}/h/${id}`,
      imageUrl: `${origin}/h/${id}/image`,
      expiresAt,
    })
  } catch (error) {
    console.error('[POST /api/highlights/share]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
