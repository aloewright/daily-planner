'use client'

import { useState } from 'react'
import {
  Calendar,
  Zap,
  Target,
  Layers,
  Moon,
  Search,
  Bell,
  Plus,
} from 'lucide-react'
import { useUnreadCount } from '@/hooks/useNotifications'
import { NotificationsPanel } from './NotificationsPanel'

type PanelId = 'calendar' | 'integrations' | 'objectives' | 'backlog' | 'archive' | 'search' | 'notifications' | 'add'

interface StripItem {
  id: PanelId
  icon: React.ElementType
  label: string
  redDot?: boolean
}

const items: StripItem[] = [
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'integrations', icon: Zap, label: 'Integrations', redDot: true },
  { id: 'objectives', icon: Target, label: 'Objectives' },
  { id: 'backlog', icon: Layers, label: 'Backlog' },
  { id: 'archive', icon: Moon, label: 'Archive' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'add', icon: Plus, label: 'Add', redDot: true },
]

export function RightIconStrip() {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null)
  const unreadCount = useUnreadCount()

  const toggle = (id: PanelId) => {
    setActivePanel((prev) => (prev === id ? null : id))
  }

  return (
    <>
      {activePanel === 'notifications' && (
        <NotificationsPanel onClose={() => setActivePanel(null)} />
      )}
      <aside className="flex flex-col items-center w-[45px] h-screen bg-[#141414] border-l border-[--color-border] flex-shrink-0 py-3 gap-1">
        {items.map(({ id, icon: Icon, label, redDot }) => {
          const active = activePanel === id
          const showDot = id === 'notifications' ? unreadCount > 0 : redDot
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              aria-label={label}
              aria-pressed={active}
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-md
                transition-colors duration-100
                ${active
                  ? 'text-[--color-accent] bg-[#1f1f1f]'
                  : 'text-white/40 hover:text-white/70 hover:bg-[#222]'
                }
              `}
            >
              <Icon size={16} strokeWidth={1.75} />
              {showDot && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          )
        })}
      </aside>
    </>
  )
}
