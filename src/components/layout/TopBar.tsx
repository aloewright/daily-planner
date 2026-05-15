'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { Menu, UnstyledButton, Avatar } from '@mantine/core'
import { authClient } from '@/lib/auth-client'

export function TopBar() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  const name = session?.user?.name ?? session?.user?.email ?? ''
  const initial = name.trim().charAt(0).toUpperCase() || 'A'
  const email = session?.user?.email

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
        <Menu shadow="md" width={220} position="bottom-end" withArrow>
          <Menu.Target>
            <UnstyledButton
              aria-label="Account menu"
              className="rounded-full"
            >
              <Avatar size={28} radius="xl" color="surface.6" variant="filled">
                <span className="text-[10px] font-semibold text-white/80">{initial}</span>
              </Avatar>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            {name && (
              <>
                <Menu.Label>
                  <div className="text-sm text-white truncate">{name}</div>
                  {email && email !== name && (
                    <div className="text-[11px] text-white/40 truncate">{email}</div>
                  )}
                </Menu.Label>
                <Menu.Divider />
              </>
            )}
            <Menu.Item
              leftSection={<Settings size={14} />}
              onClick={() => router.push('/settings')}
            >
              Settings
            </Menu.Item>
            <Menu.Item
              leftSection={<LogOut size={14} />}
              onClick={handleSignOut}
              disabled={signingOut}
              color="red"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </header>
  )
}
