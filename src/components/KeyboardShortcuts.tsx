'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { shortcuts, navChordMap, type Shortcut, type ShortcutGroup } from '@/lib/shortcuts'

const GROUP_ORDER: ShortcutGroup[] = ['General', 'Navigation', 'Tasks']

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Refs so handlers stay stable without resubscribing on every render.
  const openRef = useRef(open)
  const chordPrefixRef = useRef<boolean>(false)
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    openRef.current = open
  }, [open])

  const closeOverlay = useCallback(() => setOpen(false), [])
  const openOverlay = useCallback(() => setOpen(true), [])

  useEffect(() => {
    const ctx = {
      navigate: (href: string) => router.push(href),
      openOverlay,
      closeOverlay,
      isOverlayOpen: () => openRef.current,
    }

    function clearChord() {
      chordPrefixRef.current = false
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current)
        chordTimerRef.current = null
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Escape always closes the overlay, even if focus is in an input.
      if (e.key === 'Escape' && openRef.current) {
        e.preventDefault()
        closeOverlay()
        clearChord()
        return
      }

      // While the overlay is open, swallow other keys so shortcuts like
      // 'a' or ⌘/Ctrl+K can't mutate state on the page behind the modal.
      if (openRef.current) {
        return
      }

      if (isEditableTarget(e.target)) return

      // Resolve a pending 'g' chord first.
      if (chordPrefixRef.current) {
        const target = navChordMap[e.key.toLowerCase()]
        clearChord()
        if (target) {
          e.preventDefault()
          router.push(target)
        }
        return
      }

      // Start a 'g' chord (only when overlay is closed).
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey && !openRef.current) {
        chordPrefixRef.current = true
        chordTimerRef.current = setTimeout(clearChord, 1200)
        return
      }

      // Match a single-shortcut entry.
      for (const s of shortcuts) {
        if (s.match(e)) {
          // The '?' shortcut needs preventDefault so the browser doesn't beep.
          if (s.id === 'show-shortcuts' || s.id === 'open-search') {
            e.preventDefault()
          }
          s.run(ctx)
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearChord()
    }
  }, [router, openOverlay, closeOverlay])

  return open ? <ShortcutsOverlay onClose={closeOverlay} /> : null
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: shortcuts.filter((s) => s.group === group),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[92vw] max-h-[80vh] overflow-y-auto rounded-xl border border-[--color-border] bg-[#161616] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--color-border]">
          <h2 className="text-sm font-semibold text-white/90">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-7 h-7 rounded-md text-white/40 hover:text-white/80 hover:bg-[#222] transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {grouped.map(({ group, items }) => (
            <section key={group}>
              <h3 className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-2">
                {group}
              </h3>
              <ul className="flex flex-col">
                {items.map((s) => (
                  <ShortcutRow key={s.id} shortcut={s} />
                ))}
              </ul>
            </section>
          ))}
          <p className="text-[11px] text-white/30 pt-2 border-t border-[--color-border]">
            Press <Kbd>?</Kbd> any time to reopen this list. Press <Kbd>Esc</Kbd> to close.
          </p>
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <li className="flex items-center justify-between py-1.5">
      <span className="text-sm text-white/80">{shortcut.label}</span>
      <span className="flex items-center gap-1">
        {shortcut.keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-white/30">then</span>}
            <Kbd>{k}</Kbd>
          </span>
        ))}
      </span>
    </li>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md border border-white/15 bg-[#222] text-[11px] font-mono text-white/80 leading-none">
      {children}
    </kbd>
  )
}
