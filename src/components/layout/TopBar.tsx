'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function TopBar() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  const name = session?.user?.name ?? session?.user?.email ?? ''
  const initial = name.trim().charAt(0).toUpperCase() || 'A'

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-[#141414] border-b border-[--color-border] flex-shrink-0">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/today')}
          className="px-3 py-1.5 text-xs font-medium text-white/70 border border-[--color-border] rounded-md hover:text-white hover:border-white/30 transition-colors duration-100"
        >
          Today
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-7 h-7 rounded-full bg-[--color-surface-2] border border-[--color-border] flex items-center justify-center flex-shrink-0 hover:border-white/30 transition-colors duration-100"
          >
            <span className="text-[10px] font-semibold text-white/70">{initial}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-[#1a1a1a] border border-[--color-border] rounded-lg shadow-xl overflow-hidden">
              {name && (
                <div className="px-3 py-2 border-b border-[--color-border]">
                  <div className="text-sm text-white truncate">{name}</div>
                  {session?.user?.email && session.user.email !== name && (
                    <div className="text-[11px] text-white/40 truncate">{session.user.email}</div>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  router.push('/settings')
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-[#222] transition-colors"
              >
                <Settings size={13} />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-[#222] transition-colors disabled:opacity-50"
              >
                <LogOut size={13} />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
