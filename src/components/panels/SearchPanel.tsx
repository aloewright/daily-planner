'use client'

import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { QuickPanel } from './QuickPanel'
import { useTasksStore } from '@/store/tasks'

interface SearchPanelProps {
  open: boolean
  onClose: () => void
}

export function SearchPanel({ open, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const tasks = useTasksStore((s) => s.tasks)
  const selectTask = useTasksStore((s) => s.selectTask)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const results = q
    ? tasks
        .filter((t) => t.title.toLowerCase().includes(q))
        .slice(0, 20)
    : []

  return (
    <QuickPanel open={open} title="Search" onClose={onClose}>
      <div className="p-3 border-b border-[#2a2a2a]">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#4ade80]"
          />
        </div>
      </div>

      <div className="p-2">
        {!q && (
          <p className="text-xs text-white/30 text-center py-8">
            Start typing to search your loaded tasks
          </p>
        )}
        {q && results.length === 0 && (
          <p className="text-xs text-white/30 text-center py-8">No matches</p>
        )}
        {results.map((task) => (
          <button
            key={task.id}
            onClick={() => {
              selectTask(task.id)
              onClose()
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[#1f1f1f] transition-colors"
          >
            <div className="text-sm text-white truncate">{task.title}</div>
            {task.scheduledDate && (
              <div className="text-[11px] text-white/40 mt-0.5">
                {new Date(task.scheduledDate).toLocaleDateString()}
              </div>
            )}
          </button>
        ))}
      </div>
    </QuickPanel>
  )
}
