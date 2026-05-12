'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  BarChart2,
  Hash,
  GripVertical,
  X,
  ChevronLeft,
} from 'lucide-react'
import type { ApiTask } from '@/lib/mapTask'

// ─── Types ────────────────────────────────────────────────────────────────────

type BacklogStatus =
  | 'next-week'
  | 'next-month'
  | 'next-quarter'
  | 'next-year'
  | 'someday'
  | 'never'

interface Section {
  id: BacklogStatus
  letter: string
  label: string
  color: string
  bg: string
}

const SECTIONS: Section[] = [
  { id: 'next-week',    letter: 'W', label: 'Someday in the next week or two',  color: 'text-blue-300',   bg: 'bg-blue-800'   },
  { id: 'next-month',   letter: 'M', label: 'Someday in the next month',         color: 'text-purple-300', bg: 'bg-purple-800' },
  { id: 'next-quarter', letter: 'Q', label: 'Someday in the next quarter',       color: 'text-orange-300', bg: 'bg-orange-800' },
  { id: 'next-year',    letter: 'Y', label: 'Someday in the next year',          color: 'text-yellow-300', bg: 'bg-yellow-800' },
  { id: 'someday',      letter: 'S', label: 'Someday',                           color: 'text-green-300',  bg: 'bg-green-800'  },
  { id: 'never',        letter: 'N', label: 'Never',                             color: 'text-red-300',    bg: 'bg-red-800'    },
]

function formatMinutes(m: number): string {
  if (!m) return ''
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h${min > 0 ? ` ${min}m` : ''}` : `${min}m`
}

// ─── Draggable Task Row ────────────────────────────────────────────────────────

function DraggableTaskRow({ task }: { task: ApiTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-10 flex items-center gap-2 px-3 hover:bg-[#1a1a1a] rounded group"
    >
      <span className="text-sm text-white/80 flex-1 truncate">{task.title}</span>
      {task.channel && (
        <span
          className="text-[11px] px-1.5 py-0.5 rounded font-medium"
          style={{ backgroundColor: `${task.channel.color}22`, color: task.channel.color }}
        >
          #{task.channel.name}
        </span>
      )}
      {task.plannedTime > 0 && (
        <span className="text-[11px] text-white/40 font-mono bg-[#2a2a2a] px-1.5 py-0.5 rounded">
          {formatMinutes(task.plannedTime)}
        </span>
      )}
      <button
        {...listeners}
        {...attributes}
        className="text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Drag to schedule"
      >
        <GripVertical size={14} />
      </button>
    </div>
  )
}

// ─── Task Row Overlay (shown while dragging) ───────────────────────────────────

function TaskRowOverlay({ task }: { task: ApiTask }) {
  return (
    <div className="h-10 flex items-center gap-2 px-3 bg-[#222] border border-[#3a3a3a] rounded shadow-xl">
      <span className="text-sm text-white flex-1 truncate">{task.title}</span>
      {task.channel && (
        <span
          className="text-[11px] px-1.5 py-0.5 rounded font-medium"
          style={{ backgroundColor: `${task.channel.color}22`, color: task.channel.color }}
        >
          #{task.channel.name}
        </span>
      )}
    </div>
  )
}

// ─── Collapsible Section ───────────────────────────────────────────────────────

function BacklogSection({ section, tasks }: { section: Section; tasks: ApiTask[] }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#1a1a1a] rounded group"
      >
        <span className={`w-7 h-7 rounded-full ${section.bg} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
          {section.letter}
        </span>
        <span className="text-sm text-white/70 flex-1 text-left">{section.label}</span>
        {tasks.length > 0 && (
          <span className="text-[11px] text-white/40 bg-[#2a2a2a] px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        )}
        <span className="text-white/30 ml-1">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {!collapsed && (
        <div className="ml-9 mt-0.5">
          {tasks.length === 0 ? (
            <p className="text-[12px] text-white/20 px-3 py-2 italic">No tasks</p>
          ) : (
            tasks.map((task) => <DraggableTaskRow key={task.id} task={task} />)
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Task Dialog ───────────────────────────────────────────────────────────

interface AddTaskDialogProps {
  channels: Array<{ id: string; name: string; color: string }>
  onClose: () => void
  onAdded: () => void
}

function AddTaskDialog({ channels, onClose, onAdded }: AddTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [backlogStatus, setBacklogStatus] = useState<BacklogStatus>('someday')
  const [channelId, setChannelId] = useState('')
  const [plannedTime, setPlannedTime] = useState(0)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          backlogStatus,
          channelId: channelId || null,
          plannedTime: plannedTime || 0,
        }),
      })
      if (res.ok) {
        onAdded()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Add backlog task</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#4ade80]/50"
            />
          </div>

          {/* Horizon */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Horizon</label>
            <select
              value={backlogStatus}
              onChange={(e) => setBacklogStatus(e.target.value as BacklogStatus)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]/50"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.letter} — {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          {channels.length > 0 && (
            <div>
              <label className="block text-xs text-white/50 mb-1">Channel</label>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]/50"
              >
                <option value="">No channel</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Planned time */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Planned time (minutes)</label>
            <input
              type="number"
              min={0}
              step={15}
              value={plannedTime || ''}
              onChange={(e) => setPlannedTime(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#4ade80]/50"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[#2a2a2a] text-sm text-white/60 hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 py-2 rounded-lg bg-[#4ade80] text-black text-sm font-semibold disabled:opacity-40 hover:bg-[#22c55e] transition-colors"
            >
              {saving ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Droppable Calendar Day ────────────────────────────────────────────────────

function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  taskCount,
}: {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  taskCount: number
}) {
  const id = format(date, 'yyyy-MM-dd')
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`
        w-8 h-8 rounded flex flex-col items-center justify-center text-xs relative transition-colors
        ${isToday ? 'bg-[#4ade80] text-black font-bold' : ''}
        ${!isToday && isCurrentMonth ? 'text-white/70' : ''}
        ${!isCurrentMonth ? 'text-white/20' : ''}
        ${isOver ? 'bg-[#4ade80]/20 ring-1 ring-[#4ade80]/60' : ''}
        ${!isToday && !isOver ? 'hover:bg-[#222]' : ''}
        cursor-pointer
      `}
    >
      <span>{format(date, 'd')}</span>
      {taskCount > 0 && (
        <span
          className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-black/40' : 'bg-[#4ade80]'}`}
        />
      )}
    </div>
  )
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ scheduledTasks }: { scheduledTasks: ApiTask[] }) {
  const [viewDate, setViewDate] = useState(new Date())

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const today = new Date()

  const tasksByDay = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of scheduledTasks) {
      if (t.startDate) {
        const key = format(new Date(t.startDate), 'yyyy-MM-dd')
        map[key] = (map[key] ?? 0) + 1
      }
    }
    return map
  }, [scheduledTasks])

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className="p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate((d) => subMonths(d, 1))}
          className="text-white/40 hover:text-white/70 p-1 rounded hover:bg-[#222]"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-white/80">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewDate((d) => addMonths(d, 1))}
          className="text-white/40 hover:text-white/70 p-1 rounded hover:bg-[#222]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="w-8 h-6 flex items-center justify-center text-[10px] text-white/30">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <CalendarDay
            key={day.toISOString()}
            date={day}
            isCurrentMonth={isSameMonth(day, viewDate)}
            isToday={isSameDay(day, today)}
            taskCount={tasksByDay[format(day, 'yyyy-MM-dd')] ?? 0}
          />
        ))}
      </div>

      <p className="mt-4 text-[11px] text-white/25 text-center leading-relaxed">
        Drag a task to a day to schedule it
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BacklogPage() {
  const queryClient = useQueryClient()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [activeTask, setActiveTask] = useState<ApiTask | null>(null)
  const [channelFilter, setChannelFilter] = useState<string>('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Fetch backlog tasks
  const { data: backlogTasks = [] } = useQuery<ApiTask[]>({
    queryKey: ['backlog'],
    queryFn: () => fetch('/api/tasks?backlogStatus=all').then((r) => r.json()),
  })

  // Fetch scheduled tasks (for calendar dots)
  const { data: allTasks = [] } = useQuery<ApiTask[]>({
    queryKey: ['tasks-calendar'],
    queryFn: () => {
      const now = new Date()
      const start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
      const end = format(new Date(now.getFullYear(), now.getMonth() + 2, 0), 'yyyy-MM-dd')
      return fetch(`/api/tasks?startDate=${start}&endDate=${end}`).then((r) => r.json())
    },
  })

  // Fetch channels
  const { data: channels = [] } = useQuery<Array<{ id: string; name: string; color: string }>>({
    queryKey: ['channels'],
    queryFn: () => fetch('/api/channels').then((r) => r.json()),
  })

  // Group tasks by backlog status, applying channel filter
  const grouped = useMemo(() => {
    const filtered = channelFilter
      ? backlogTasks.filter((t) => t.channelId === channelFilter)
      : backlogTasks
    const result: Record<BacklogStatus, ApiTask[]> = {
      'next-week': [],
      'next-month': [],
      'next-quarter': [],
      'next-year': [],
      someday: [],
      never: [],
    }
    for (const t of filtered) {
      const s = t.backlogStatus as BacklogStatus
      if (s && s in result) {
        result[s].push(t)
      }
    }
    return result
  }, [backlogTasks, channelFilter])

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as ApiTask | undefined
    setActiveTask(task ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { over, active } = event
    if (!over) return

    const task = active.data.current?.task as ApiTask | undefined
    if (!task) return

    // over.id is 'yyyy-MM-dd'
    const dateStr = over.id as string
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return

    // PATCH task: set startDate, clear backlogStatus
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: dateStr,
        backlogStatus: null,
      }),
    })

    queryClient.invalidateQueries({ queryKey: ['backlog'] })
    queryClient.invalidateQueries({ queryKey: ['tasks-calendar'] })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full bg-[#0f0f0f]">
        {/* ── Left panel ───────────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ flex: '0 0 60%', minWidth: 0 }}>
          {/* Filter bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2a2a2a]">
            <button className="flex items-center gap-1.5 bg-[#4ade80]/10 text-[#4ade80] text-xs font-medium px-3 py-1.5 rounded-full border border-[#4ade80]/30 hover:bg-[#4ade80]/20 transition-colors">
              All backlog tasks
            </button>

            {/* Channel filter */}
            <div className="relative">
              <button
                className="flex items-center gap-1 text-white/40 hover:text-white/70 px-2 py-1.5 rounded hover:bg-[#1a1a1a] text-xs transition-colors"
                onClick={() => {
                  // cycle through channel filter
                  if (!channelFilter) {
                    if (channels.length > 0) setChannelFilter(channels[0].id)
                  } else {
                    const idx = channels.findIndex((c) => c.id === channelFilter)
                    if (idx === channels.length - 1) setChannelFilter('')
                    else setChannelFilter(channels[idx + 1]?.id ?? '')
                  }
                }}
              >
                <Hash size={13} />
                <span>
                  {channelFilter
                    ? channels.find((c) => c.id === channelFilter)?.name ?? 'Channel'
                    : 'Channel'}
                </span>
              </button>
            </div>

            <button className="text-white/40 hover:text-white/70 p-1.5 rounded hover:bg-[#1a1a1a] transition-colors ml-0.5">
              <BarChart2 size={14} />
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white/70 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Add task
            </button>
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {SECTIONS.map((section) => (
              <BacklogSection
                key={section.id}
                section={section}
                tasks={grouped[section.id]}
              />
            ))}
          </div>
        </div>

        {/* ── Right panel (mini calendar) ──────────────────────────────── */}
        <div className="flex flex-col flex-1 bg-[#141414] border-l border-[#2a2a2a] min-w-0">
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Schedule
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MiniCalendar scheduledTasks={allTasks} />
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask ? <TaskRowOverlay task={activeTask} /> : null}
      </DragOverlay>

      {/* Add task dialog */}
      {showAddDialog && (
        <AddTaskDialog
          channels={channels}
          onClose={() => setShowAddDialog(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['backlog'] })
          }}
        />
      )}
    </DndContext>
  )
}
