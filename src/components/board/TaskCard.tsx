'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useTasksStore } from '@/store/tasks'
import type { Task } from '@/types/index'

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}:${String(min).padStart(2, '0')}` : `0:${String(min).padStart(2, '0')}`
}

interface TaskCardProps {
  task: Task
  onCompleteToggle: (task: Task) => void
}

export function TaskCard({ task, onCompleteToggle }: TaskCardProps) {
  const selectTask = useTasksStore((s) => s.selectTask)
  const [completing, setCompleting] = useState(false)

  const subtaskCount = task.subtasks?.length ?? 0
  const plannedTime = task.estimatedMinutes ?? 0

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

  return (
    <div
      onClick={() => selectTask(task.id)}
      className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 cursor-pointer hover:bg-[#1f1f1f] hover:border-[#333333] transition-colors duration-100"
    >
      {/* Top row: scheduled time + planned time badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-white/40 font-mono">
          {task.scheduledStart ?? ''}
        </span>
        {plannedTime > 0 && (
          <span className="text-[11px] text-white/70 font-mono bg-[#2a2a2a] px-1.5 py-0.5 rounded">
            {formatMinutes(plannedTime)}
          </span>
        )}
      </div>

      {/* Title */}
      <p
        className={`text-sm font-medium leading-snug mb-1.5 ${
          task.status === 'done' ? 'line-through text-white/40' : 'text-white'
        }`}
      >
        {task.title}
      </p>

      {/* Subtask count */}
      {subtaskCount > 0 && (
        <p className="text-[11px] text-white/40 mb-2">
          {subtaskCount} subtask{subtaskCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Bottom row: actions */}
      <div className="flex items-center gap-2 mt-1">
        {/* Completion circle */}
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
          {task.status === 'done' && (
            <Check size={10} className="text-black" strokeWidth={3} />
          )}
        </button>

        {/* Channel badge */}
        {task.channel && (
          <span className="ml-auto text-[11px] text-amber-400 font-medium truncate max-w-[80px]">
            #{task.channel.name}
          </span>
        )}
      </div>
    </div>
  )
}
