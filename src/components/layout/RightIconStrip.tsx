'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Layers, Search, Bell, Plus } from 'lucide-react'
import { SearchPanel } from '@/components/panels/SearchPanel'
import { ObjectivesPanel } from '@/components/panels/ObjectivesPanel'
import { NotificationsPanel } from '@/components/panels/NotificationsPanel'

type PanelId = 'search' | 'objectives' | 'notifications'

interface StripItem {
  id: PanelId | 'backlog' | 'add'
  icon: React.ElementType
  label: string
}

const items: StripItem[] = [
  { id: 'add', icon: Plus, label: 'Quick add' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'objectives', icon: Target, label: 'Weekly objectives' },
  { id: 'backlog', icon: Layers, label: 'Backlog' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
]

export function RightIconStrip() {
  const router = useRouter()
  const [activePanel, setActivePanel] = useState<PanelId | null>(null)

  useEffect(() => {
    function openSearch() {
      setActivePanel('search')
    }
    document.addEventListener('open-search', openSearch)
    return () => document.removeEventListener('open-search', openSearch)
  }, [])

  const handleClick = useCallback(
    (id: StripItem['id']) => {
      if (id === 'add') {
        // Dispatch event picked up by board/today pages
        document.dispatchEvent(new CustomEvent('add-task'))
        return
      }
      if (id === 'backlog') {
        router.push('/backlog')
        return
      }
      setActivePanel((prev) => (prev === id ? null : id))
    },
    [router],
  )

  return (
    <>
      <aside className="flex flex-col items-center w-[45px] h-screen bg-[#141414] border-l border-(--color-border) flex-shrink-0 py-3 gap-1">
        {items.map(({ id, icon: Icon, label }) => {
          const active =
            (id === 'search' || id === 'objectives' || id === 'notifications') &&
            activePanel === id
          return (
            <button
              key={id}
              onClick={() => handleClick(id)}
              aria-label={label}
              aria-pressed={active}
              title={label}
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-md
                transition-colors duration-100
                ${active
                  ? 'text-(--color-accent) bg-[#1f1f1f]'
                  : 'text-white/40 hover:text-white/70 hover:bg-[#222]'
                }
              `}
            >
              <Icon size={16} strokeWidth={1.75} />
            </button>
          )
        })}
      </aside>

      <SearchPanel
        open={activePanel === 'search'}
        onClose={() => setActivePanel(null)}
      />
      <ObjectivesPanel
        open={activePanel === 'objectives'}
        onClose={() => setActivePanel(null)}
      />
      <NotificationsPanel
        open={activePanel === 'notifications'}
        onClose={() => setActivePanel(null)}
      />
    </>
  )
}
