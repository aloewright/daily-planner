'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House,
  CheckSquare,
  Coffee,
  ClipboardList,
  BookOpen,
  Feather,
  Clipboard,
  BookText,
  Archive,
  LayoutGrid,
} from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  greenDot?: boolean
}

const dailyItems: NavItem[] = [
  { icon: House, label: 'Home', href: '/board' },
  { icon: CheckSquare, label: 'Today', href: '/today' },
  { icon: Coffee, label: 'Focus', href: '/focus' },
  { icon: ClipboardList, label: 'Plan', href: '/plan', greenDot: false },
  { icon: BookOpen, label: 'Shutdown', href: '/shutdown' },
  { icon: Feather, label: 'Highlights', href: '/highlights' },
]

const weeklyItems: NavItem[] = [
  { icon: Clipboard, label: 'Plan', href: '/weekly/plan' },
  { icon: BookText, label: 'Review', href: '/weekly/review' },
  { icon: Archive, label: 'Backlog', href: '/backlog' },
]

const otherItems: NavItem[] = [
  { icon: LayoutGrid, label: 'Apps', href: '/apps' },
]

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`
        relative flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-md
        transition-colors duration-100
        ${active
          ? 'text-[--color-accent] bg-[#1f1f1f]'
          : 'text-white/40 hover:text-white/70 hover:bg-[#1a1a1a]'
        }
      `}
    >
      <item.icon size={18} strokeWidth={1.75} />
      <span className="text-[9px] leading-tight tracking-wide font-medium">
        {item.label}
      </span>
      {item.greenDot && (
        <span className="absolute top-1.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[--color-accent]" />
      )}
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <span className="text-[8px] font-semibold tracking-widest uppercase text-white/20 px-2 pt-3 pb-0.5 select-none">
      {label}
    </span>
  )
}

export function LeftSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/board') return pathname === '/board' || pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="flex flex-col items-center w-[65px] h-screen bg-[#141414] border-r border-[--color-border] flex-shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-center w-full py-4">
        <div className="w-8 h-8 rounded-full bg-[--color-amber] flex items-center justify-center flex-shrink-0">
          <Coffee size={16} strokeWidth={2.25} className="text-black" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col items-center w-full flex-1 gap-0 px-1.5 overflow-y-auto scrollbar-none">
        <SectionLabel label="Daily" />
        {dailyItems.map((item) => (
          <NavButton key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <SectionLabel label="Weekly" />
        {weeklyItems.map((item) => (
          <NavButton key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <SectionLabel label="Other" />
        {otherItems.map((item) => (
          <NavButton key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

    </aside>
  )
}
