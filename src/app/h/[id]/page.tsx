import type { Metadata } from 'next'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const imageUrl = `/h/${id}/image`
  return {
    title: 'Weekly Highlights',
    description: 'A recap of completed tasks from the last 7 days.',
    openGraph: {
      title: 'Weekly Highlights',
      description: 'A recap of completed tasks from the last 7 days.',
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Weekly Highlights',
      images: [imageUrl],
    },
  }
}

export default async function SharedHighlightsPage({ params }: { params: Params }) {
  const { id } = await params
  if (!/^[a-f0-9]{32}$/.test(id)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white/60">
        <p>Invalid share link.</p>
      </main>
    )
  }

  const imageUrl = `/h/${id}/image`

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] px-6 py-10 text-white">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Weekly Highlights</h1>
        <p className="text-sm text-white/40">A recap of completed tasks from the last 7 days.</p>
      </div>
      <div className="w-full max-w-[1024px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Weekly highlights recap"
          width={1200}
          height={630}
          className="block w-full h-auto"
        />
      </div>
      <a
        href={imageUrl}
        download={`highlights-${id}.png`}
        className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        Download PNG
      </a>
      <p className="text-xs text-white/30">Share links expire after 7 days.</p>
    </main>
  )
}
