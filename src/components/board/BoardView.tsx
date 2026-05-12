'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { startOfDay, addDays, subDays, format, isSameDay } from 'date-fns'
import { DayColumn } from './DayColumn'
import { useTasksStore } from '@/store/tasks'
import { mapApiTaskToTask, type ApiTask } from '@/lib/mapTask'
import type { Task } from '@/types/index'
import { useEffect } from 'react'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

function SkeletonColumn() {
  return (
    <div className="flex flex-col min-w-[220px] flex-1 animate-pulse">
      <div className="h-5 bg-[#2a2a2a] rounded w-20 mb-1" />
      <div className="h-0.5 bg-[#2a2a2a] rounded mb-3" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function BoardView() {
  const today = startOfDay(new Date())
  const days = [
    subDays(today, 2),
    subDays(today, 1),
    today,
    addDays(today, 1),
    addDays(today, 2),
  ]

  const startDate = format(days[0], 'yyyy-MM-dd')
  const endDate = format(days[days.length - 1], 'yyyy-MM-dd')

  const { setTasks, tasks, addTask: addToStore, updateTask } = useTasksStore()
  const queryClient = useQueryClient()

  const { data: apiTasks, isLoading, error } = useQuery<ApiTask[]>({
    queryKey: ['tasks', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/tasks?startDate=${startDate}&endDate=${endDate}&userId=${DEMO_USER_ID}`
      )
      if (!res.ok) throw new Error('Failed to fetch tasks')
      return res.json()
    },
  })

  useEffect(() => {
    if (apiTasks) {
      setTasks(apiTasks.map(mapApiTaskToTask))
    }
  }, [apiTasks, setTasks])

  function getTasksForDay(date: Date): Task[] {
    return tasks.filter((t) => {
      if (!t.scheduledDate) return false
      return isSameDay(new Date(t.scheduledDate), date)
    })
  }

  async function handleAddTask(title: string, date: Date) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        startDate: format(date, 'yyyy-MM-dd'),
        userId: DEMO_USER_ID,
      }),
    })
    if (!res.ok) return
    const apiTask: ApiTask = await res.json()
    const task = mapApiTaskToTask(apiTask)
    addToStore(task)
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  async function handleCompleteToggle(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}/complete`, {
      method: 'POST',
    })
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Board columns */}
      <div className="flex gap-4 flex-1 overflow-x-auto px-6 py-6 min-h-0">
        {days.map((date) => (
          <DayColumn
            key={date.toISOString()}
            date={date}
            tasks={getTasksForDay(date)}
            isToday={isSameDay(date, today)}
            isLoading={isLoading}
            onAddTask={handleAddTask}
            onCompleteToggle={handleCompleteToggle}
          />
        ))}
      </div>
    </div>
  )
}
