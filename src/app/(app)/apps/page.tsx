'use client'

import {
  BookOpen,
  PenSquare,
  BookMarked,
  Link2,
  MessageCircle,
  Palette,
  Globe,
  Video,
} from 'lucide-react'
import type { ElementType } from 'react'

type AppLink = {
  name: string
  url: string
  description: string
  icon: ElementType
}

const APPS: AppLink[] = [
  {
    name: 'Blog',
    url: 'https://aloewright.com',
    description: 'aloewright.com',
    icon: BookOpen,
  },
  {
    name: 'Blog Editor',
    url: 'https://dev.aloewright.com',
    description: 'dev.aloewright.com',
    icon: PenSquare,
  },
  {
    name: 'Book Editor',
    url: 'https://book-cook.com',
    description: 'book-cook.com',
    icon: BookMarked,
  },
  {
    name: 'Link Shortener',
    url: 'https://fly.pm',
    description: 'fly.pm',
    icon: Link2,
  },
  {
    name: 'Chat',
    url: 'https://alex.chat',
    description: 'alex.chat',
    icon: MessageCircle,
  },
  {
    name: 'Design System Generator',
    url: 'https://so.makethe.app',
    description: 'so.makethe.app',
    icon: Palette,
  },
  {
    name: 'Directory',
    url: 'https://makethe.app',
    description: 'makethe.app',
    icon: Globe,
  },
  {
    name: 'Video Manager',
    url: 'https://spooool.com',
    description: 'spooool.com',
    icon: Video,
  },
]

export default function AppsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Apps</h1>
        <p className="text-white/40 text-sm mt-1">Your other tools</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {APPS.map((app) => (
          <a
            key={app.url}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#4ade80]/40 hover:bg-[#1f1f1f] transition-colors"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[#222222] text-white/70 group-hover:text-[#4ade80] transition-colors flex-shrink-0">
              <app.icon size={18} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{app.name}</div>
              <div className="text-xs text-white/40 truncate mt-0.5">{app.description}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
