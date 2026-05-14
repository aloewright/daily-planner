'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface QuickPanelProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function QuickPanel({ open, title, onClose, children }: QuickPanelProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-[45px] h-screen w-[360px] bg-[#141414] border-l border-[#2a2a2a] z-50 flex flex-col overflow-hidden transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}
