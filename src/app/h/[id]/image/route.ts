export const runtime = 'nodejs'

interface SharedR2Object {
  body: ReadableStream
  customMetadata?: Record<string, string>
}

interface SharedR2Bucket {
  get(key: string): Promise<SharedR2Object | null>
  delete(key: string): Promise<unknown>
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!/^[a-f0-9]{32}$/.test(id)) {
    return new Response('Not found', { status: 404 })
  }

  const bucket = await getR2Bucket()
  if (!bucket) return new Response('Share storage unavailable', { status: 503 })

  const object = await bucket.get(`highlights/${id}.png`)
  if (!object) return new Response('Not found', { status: 404 })

  const expiresAtRaw = object.customMetadata?.expiresAt
  if (expiresAtRaw && Number(expiresAtRaw) < Date.now()) {
    // Best-effort cleanup; ignore failure.
    bucket.delete(`highlights/${id}.png`).catch(() => {})
    return new Response('This share link has expired', { status: 410 })
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300, immutable',
    },
  })
}
