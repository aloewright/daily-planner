'use client'

import { useEffect, useState } from 'react'
import { Toggle } from '@/components/ui/Toggle'

interface ShareResult {
  id: string
  url: string
  imageUrl: string
  expiresAt: number
}

interface ShareModalProps {
  open: boolean
  onClose: () => void
}

export function ShareModal({ open, onClose }: ShareModalProps) {
  const [hideTitles, setHideTitles] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [share, setShare] = useState<ShareResult | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    // Reset state every time the modal opens.
    setShare(null)
    setShareError(null)
    setCopied(false)
    setPreviewUrl(`/api/highlights/og?hideTitles=${hideTitles ? 'true' : 'false'}&t=${Date.now()}`)
  }, [open, hideTitles])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  async function handleCreateLink() {
    setSharing(true)
    setShareError(null)
    try {
      const res = await fetch('/api/highlights/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideTitles }),
      })
      if (res.status === 503) {
        setShareError(
          'Public links are not configured for this deployment. You can still download the image.',
        )
        return
      }
      if (!res.ok) {
        setShareError('Failed to create share link. Try again.')
        return
      }
      const data: ShareResult = await res.json()
      setShare(data)
    } catch {
      setShareError('Network error. Try again.')
    } finally {
      setSharing(false)
    }
  }

  async function handleCopy() {
    if (!share) return
    try {
      await navigator.clipboard.writeText(share.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const downloadUrl = `/api/highlights/og?hideTitles=${hideTitles ? 'true' : 'false'}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share highlights"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Share your week</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/40 hover:bg-white/5 hover:text-white/70"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Weekly highlights preview"
              width={1200}
              height={630}
              className="block w-full h-auto"
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex flex-col">
            <span className="text-sm text-white/80">Hide task titles</span>
            <span className="text-[11px] text-white/40">
              Recommended when sharing widely. Calendar-imported items are always hidden.
            </span>
          </div>
          <Toggle checked={hideTitles} onChange={setHideTitles} label="Hide task titles" />
        </div>

        {shareError && (
          <p className="mt-3 text-xs text-amber-400/80">{shareError}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href={downloadUrl}
            download="weekly-highlights.png"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Download PNG
          </a>
          {!share ? (
            <button
              onClick={handleCreateLink}
              disabled={sharing}
              className="rounded-lg bg-[#4ade80] px-3 py-2 text-sm font-semibold text-black hover:bg-[#3ed070] disabled:opacity-60"
            >
              {sharing ? 'Creating link…' : 'Create public link'}
            </button>
          ) : (
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <input
                readOnly
                value={share.url}
                className="flex-1 bg-transparent text-xs text-white/80 outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                onClick={handleCopy}
                className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/15"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {share && (
          <p className="mt-2 text-[11px] text-white/30">
            Link expires {new Date(share.expiresAt).toLocaleDateString()} (7 days).
          </p>
        )}
      </div>
    </div>
  )
}
