'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'

type ViewOption =
  | 'Board'
  | 'Calendar · One day'
  | 'Calendar · Three days'
  | 'Calendar · Weekdays'
  | 'Calendar · Week'
  | 'Calendar · Month'

const VIEW_OPTIONS: ViewOption[] = [
  'Board',
  'Calendar · One day',
  'Calendar · Three days',
  'Calendar · Weekdays',
  'Calendar · Week',
  'Calendar · Month',
]

export function TopBar() {
  const router = useRouter()
  const [view, setView] = useState<ViewOption>('Board')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const goToToday = () => router.push('/today')

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-[#141414] border-b border-[--color-border] flex-shrink-0">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-xs font-medium text-white/70 border border-[--color-border] rounded-md hover:text-white hover:border-white/30 transition-colors duration-100"
        >
          Today
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/50 border border-[--color-border] rounded-md hover:text-white/70 hover:border-white/20 transition-colors duration-100"
          aria-label="Filter"
        >
          <SlidersHorizontal size={12} strokeWidth={1.75} />
          Filter
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* View dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/70 border border-[--color-border] rounded-md hover:text-white hover:border-white/30 transition-colors duration-100"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            {view}
            <ChevronDown size={12} strokeWidth={2} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-[#1a1a1a] border border-[--color-border] rounded-lg shadow-xl overflow-hidden">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option}
                  role="option"
                  aria-selected={view === option}
                  onClick={() => {
                    setView(option)
                    setDropdownOpen(false)
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-xs transition-colors duration-75
                    ${view === option
                      ? 'text-[--color-accent] bg-[#222]'
                      : 'text-white/60 hover:text-white hover:bg-[#222]'
                    }
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Calendars button */}
        <button className="px-3 py-1.5 text-xs font-medium text-white/50 border border-[--color-border] rounded-md hover:text-white/70 hover:border-white/20 transition-colors duration-100">
          Calendars
        </button>

        {/* User avatar */}
        <div className="w-7 h-7 rounded-full bg-[--color-surface-2] border border-[--color-border] flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-white/30 transition-colors duration-100">
          <span className="text-[10px] font-semibold text-white/60">A</span>
        </div>
      </div>
    </header>
  )
}
