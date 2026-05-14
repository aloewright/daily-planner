'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfDay, isSameDay } from 'date-fns'
import { Plus, ArrowUpDown, Check, Clock, Calendar } from 'lucide-react'
import { useState } from 'react'
import { useTasksStore } from '@/store/tasks'
import { mapApiTaskToTask, type ApiTask } from '@/lib/mapTask'
import type { Task } from '@/types/index'

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}:${String(min).padStart(2, '0')}` : `0:${String(min).padStart(2, '0')}`
}

function TaskCardRow({ task, onCompleteToggle }: { task: Task; onCompleteToggle: (t: Task) => void }) {
  const selectTask = useTasksStore((s) => s.selectTask)
  const [completing, setCompleting] = useState(false)

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    if (completing) return
    setCompleting(true)
    try {
      await onCompleteToggle(task)
    } finally {
      setCompleting(false)
    }
  }

  const subtaskCount = task.subtasks?.length ?? 0
  const plannedTime = task.estimatedMinutes ?? 0

  return (
    <div
      onClick={() => selectTask(task.id)}
      className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 cursor-pointer hover:bg-[#1f1f1f] hover:border-[#333333] transition-colors duration-100"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-white/40 font-mono">{task.scheduledStart ?? ''}</span>
        {plannedTime > 0 && (
          <span className="text-[11px] text-white/70 font-mono bg-[#2a2a2a] px-1.5 py-0.5 rounded">
            {formatMinutes(plannedTime)}
          </span>
        )}
      </div>
      <p
        className={`text-sm font-medium leading-snug mb-1.5 ${
          task.status === 'done' ? 'line-through text-white/40' : 'text-white'
        }`}
      >
        {task.title}
      </p>
      {subtaskCount > 0 && (
        <p className="text-[11px] text-white/40 mb-2">
          {subtaskCount} subtask{subtaskCount !== 1 ? 's' : ''}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={handleComplete}
          disabled={completing}
          className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors duration-100 ${
            task.status === 'done'
              ? 'bg-[#4ade80] border-[#4ade80]'
              : 'border-white/30 hover:border-white/60'
          }`}
          aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.status === 'done' && <Check size={10} className="text-black" strokeWidth={3} />}
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-white/25 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Schedule"
        >
          <Calendar size={12} strokeWidth={1.75} />
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-white/25 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Set time"
        >
          <Clock size={12} strokeWidth={1.75} />
        </button>
        {task.channel && (
          <span className="ml-auto text-[11px] text-amber-400 font-medium truncate max-w-[80px]">
            #{task.channel.name}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TodayPage() {
  const today = startOfDay(new Date())
  const todayStr = format(today, 'yyyy-MM-dd')

  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { setTasks, tasks, addTask: addToStore, updateTask } = useTasksStore()
  const queryClient = useQueryClient()

  const { data: apiTasks, isLoading, error } = useQuery<ApiTask[]>({
    queryKey: ['tasks-today', todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?startDate=${todayStr}&endDate=${todayStr}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      return res.json()
    },
  })

  useEffect(() => {
    if (apiTasks) {
      setTasks(apiTasks.map(mapApiTaskToTask))
    }
  }, [apiTasks, setTasks])

  // Listen for 'add-task' custom event from keyboard shortcut
  useEffect(() => {
    function handleAddTaskEvent() {
      setShowInput(true)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    document.addEventListener('add-task', handleAddTaskEvent)
    return () => document.removeEventListener('add-task', handleAddTaskEvent)
  }, [])

  const todayTasks = tasks.filter((t) => {
    if (!t.scheduledDate) return false
    return isSameDay(new Date(t.scheduledDate), today)
  })

  const completedCount = todayTasks.filter((t) => t.status === 'done').length
  const totalCount = todayTasks.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const totalPlannedMinutes = todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0)

  async function handleAddTask() {
    const title = inputValue.trim()
    if (!title || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startDate: todayStr }),
      })
      if (res.ok) {
        const apiTask: ApiTask = await res.json()
        const task = mapApiTaskToTask(apiTask)
        addToStore(task)
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        setInputValue('')
        setShowInput(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAddTask()
    else if (e.key === 'Escape') {
      setInputValue('')
      setShowInput(false)
    }
  }

  async function handleCompleteToggle(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}/complete`, { method: 'POST' })
    if (!res.ok) return
    const apiTask: ApiTask = await res.json()
    const updated = mapApiTaskToTask(apiTask)
    updateTask(task.id, { status: updated.status })
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-400 text-sm">Failed to load tasks. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-auto px-6 py-6">
      <div className="w-full max-w-[640px] mx-auto flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="text-xl font-bold text-white">Today</h1>
            <span className="text-sm text-white/40">{format(today, 'EEEE, MMM d')}</span>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 w-full bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4ade80] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-white/30">
              {completedCount} / {totalCount} tasks
            </span>
            {totalPlannedMinutes > 0 && (
              <span className="text-[11px] text-white/60 font-mono bg-[#2a2a2a] px-1.5 py-0.5 rounded-full">
                {formatMinutes(totalPlannedMinutes)} planned
              </span>
            )}
          </div>
        </div>

        {/* Add task row */}
        <div className="flex items-center justify-between mb-3 px-0.5">
          <button
            onClick={() => {
              setShowInput(true)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors duration-100 text-xs"
          >
            <Plus size={13} strokeWidth={2} />
            <span>Add task</span>
          </button>
          <button className="text-white/20 hover:text-white/50 transition-colors duration-100" aria-label="Sort">
            <ArrowUpDown size={12} strokeWidth={1.75} />
          </button>
        </div>

        {/* Inline input */}
        {showInput && (
          <div className="mb-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!inputValue.trim()) setShowInput(false)
              }}
              placeholder="Task title..."
              className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#4ade80]/50 transition-colors"
            />
          </div>
        )}

        {/* Task list */}
        {isLoading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg" />
            ))}
          </div>
        ) : todayTasks.length === 0 && !showInput ? (
          <div className="border border-dashed border-[#2a2a2a] rounded-lg py-10 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-white/25">No tasks planned for today.</p>
            <p className="text-xs text-white/15">Press A to add one.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todayTasks.map((task) => (
              <TaskCardRow key={task.id} task={task} onCompleteToggle={handleCompleteToggle} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
