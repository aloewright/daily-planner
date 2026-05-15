'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { startOfDay, addDays, subDays, format, isSameDay } from 'date-fns'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { DayColumn } from './DayColumn'
import { TaskCard } from './TaskCard'
import { useTasksStore } from '@/store/tasks'
import { mapApiTaskToTask, type ApiTask } from '@/lib/mapTask'
import type { Task } from '@/types/index'

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
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const { data: apiTasks, isLoading, error } = useQuery<ApiTask[]>({
    queryKey: ['tasks', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/tasks?startDate=${startDate}&endDate=${endDate}`,
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

  function handleDragStart(event: DragStartEvent) {
    const draggedId = String(event.active.id)
    const task = tasks.find((t) => t.id === draggedId) ?? null
    setActiveTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = String(active.id)
    const targetDate = String(over.id) // 'yyyy-MM-dd'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // No-op if dropped on the same day. Compare as local 'yyyy-MM-dd' strings —
    // `new Date('yyyy-MM-dd')` parses as UTC midnight which shifts the day in
    // negative-UTC timezones (e.g. PDT) and breaks isSameDay.
    const taskDateStr = task.scheduledDate ? format(task.scheduledDate, 'yyyy-MM-dd') : null
    if (taskDateStr === targetDate) return

    // Optimistic update — parse target as local midnight so the new date keeps
    // the calendar day the user dropped onto.
    const [y, m, d] = targetDate.split('-').map(Number)
    const localTarget = new Date(y, m - 1, d)
    updateTask(taskId, { scheduledDate: localTarget })

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: targetDate }),
    })

    if (!res.ok) {
      // Revert on failure
      updateTask(taskId, { scheduledDate: task.scheduledDate })
    }
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-400 text-sm">Failed to load tasks. Please try again.</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">
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
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onCompleteToggle={handleCompleteToggle} asOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
