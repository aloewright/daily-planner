'use client'

import { useState, useRef } from 'react'
import { Plus, ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { TaskCard } from './TaskCard'
import { useTasksStore } from '@/store/tasks'
import type { Task } from '@/types/index'

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}:${String(min).padStart(2, '0')}` : `0:${String(min).padStart(2, '0')}`
}

interface DayColumnProps {
  date: Date
  tasks: Task[]
  isToday: boolean
  onAddTask: (title: string, date: Date) => Promise<void>
  onCompleteToggle: (task: Task) => void
}

export function DayColumn({ date, tasks, isToday, onAddTask, onCompleteToggle }: DayColumnProps) {
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useTasksStore((s) => s.addTask)

  const completedCount = tasks.filter((t) => t.status === 'done').length
  const totalCount = tasks.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const totalPlannedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0)

  const dayName = format(date, 'EEEE')
  const dateStr = format(date, 'MMM d')

  async function handleAddTask() {
    const title = inputValue.trim()
    if (!title || submitting) return
    setSubmitting(true)
    try {
      await onAddTask(title, date)
      setInputValue('')
      setShowInput(false)
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleAddTask()
    } else if (e.key === 'Escape') {
      setInputValue('')
      setShowInput(false)
    }
  }

  function handleShowInput() {
    setShowInput(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <h2 className={`text-base font-bold leading-tight ${isToday ? 'text-white' : 'text-white/70'}`}>
            {dayName}
          </h2>
          <span className="text-xs text-white/30">{dateStr}</span>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4ade80] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Add task row */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <button
          onClick={handleShowInput}
          className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors duration-100 text-xs"
        >
          <Plus size={13} strokeWidth={2} />
          <span>Add task</span>
        </button>
        <div className="flex items-center gap-1.5">
          {totalPlannedMinutes > 0 && (
            <span className="text-[11px] text-white/60 font-mono bg-[#2a2a2a] px-1.5 py-0.5 rounded-full">
              {formatMinutes(totalPlannedMinutes)}
            </span>
          )}
          <button className="text-white/20 hover:text-white/50 transition-colors duration-100" aria-label="Sort">
            <ArrowUpDown size={12} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Inline input */}
      {showInput && (
        <div className="mb-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!inputValue.trim()) {
                setShowInput(false)
              }
            }}
            placeholder="Task title..."
            className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#4ade80]/50 transition-colors"
          />
        </div>
      )}

      {/* Task list */}
      <div className="flex flex-col gap-2 flex-1">
        {tasks.length === 0 && !showInput && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-white/15">No tasks</span>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onCompleteToggle={onCompleteToggle}
          />
        ))}
      </div>
    </div>
  )
}
