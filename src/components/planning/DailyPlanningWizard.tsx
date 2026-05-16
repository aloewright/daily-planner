'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  GripVertical,
  Star,
  Share2,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface PlanTask {
  id: string
  title: string
  plannedTime: number  // minutes
  priority: boolean
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h === 0) return `0:${String(min).padStart(2, '0')}`
  return `${h}:${String(min).padStart(2, '0')}`
}

function addMinutesToTime(baseHour: number, baseMin: number, addMins: number) {
  const total = baseHour * 60 + baseMin + addMins
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`
}

// ────────────────────────────────────────────────────────────
// Progress Bar
// ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[1, 2, 3, 4, 5, 6].map((n) => {
        const done = step > n
        const current = step === n
        return (
          <div key={n} className="flex items-center gap-3">
            <div
              className={`
                w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all duration-200
                ${done
                  ? 'bg-[#4ade80] border-[#4ade80] text-black'
                  : current
                    ? 'bg-[#4ade80] border-[#4ade80] text-black'
                    : 'border-white/20 text-white/30 bg-transparent'
                }
              `}
            >
              {done ? <Check size={14} strokeWidth={3} /> : n}
            </div>
            {n < 6 && (
              <div
                className={`w-8 h-px ${step > n ? 'bg-[#4ade80]' : 'bg-white/10'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Time Badge
// ────────────────────────────────────────────────────────────

function TimeBadge({ minutes }: { minutes: number }) {
  return (
    <span className="text-[11px] font-mono bg-[#2a2a2a] text-white/60 px-2 py-0.5 rounded flex-shrink-0">
      {formatMinutes(minutes)}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Planned-for-today panel (right side)
// ────────────────────────────────────────────────────────────

function PlannedPanel({ tasks }: { tasks: PlanTask[] }) {
  return (
    <div className="w-64 flex-shrink-0 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
        Planned for today
      </p>
      {tasks.length === 0 ? (
        <p className="text-sm text-white/20 italic">No tasks yet</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-white/80 truncate">{t.title}</span>
              {t.plannedTime > 0 && <TimeBadge minutes={t.plannedTime} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Step 1 — Add a task
// ────────────────────────────────────────────────────────────

function Step1({
  tasks,
  onAddTask,
}: {
  tasks: PlanTask[]
  onAddTask: (title: string) => void
}) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim()) {
      onAddTask(value.trim())
      setValue('')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold text-white mb-1">
          What&apos;s on your plate today?
        </h2>
        <p className="text-sm text-white/40 mb-5">
          Add the tasks you need to get done. Press Enter to add each one.
        </p>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you need to get done today?"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#4ade80]/50 transition-colors"
        />
        <p className="text-xs text-white/25 mt-2">Press Enter to add</p>
      </div>
      <PlannedPanel tasks={tasks} />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Step 2 — Estimate timing
// ────────────────────────────────────────────────────────────

function Step2({
  tasks,
  onEstimate,
}: {
  tasks: PlanTask[]
  onEstimate: (id: string, minutes: number) => void
}) {
  const unestimated = tasks.find((t) => t.plannedTime === 0)
  const [sliderValue, setSliderValue] = useState(60)

  const task = unestimated ?? tasks[0]

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value)
    setSliderValue(val)
    if (task) {
      onEstimate(task.id, val)
    }
  }

  if (!task) {
    return (
      <div className="text-center py-10 text-white/40">
        No tasks to estimate yet. Go back and add some.
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-white mb-1">
        Estimate your time
      </h2>
      <p className="text-sm text-white/40 mb-6">
        How long will this take? Drag to set.
      </p>

      {/* Task card with time badge */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{task.title}</span>
        <TimeBadge minutes={sliderValue} />
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={480}
          step={5}
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#4ade80]"
          style={{
            background: `linear-gradient(to right, #4ade80 ${(sliderValue / 480) * 100}%, #2a2a2a ${(sliderValue / 480) * 100}%)`,
          }}
        />
        {/* Markers */}
        <div className="flex justify-between mt-2 text-[11px] text-white/30 font-mono">
          <span>0 min</span>
          <span>6 hr</span>
          <span>8 hr</span>
        </div>
      </div>

      {/* All tasks estimated so far */}
      {tasks.filter((t) => t.plannedTime > 0).length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">
            Estimated
          </p>
          <ul className="space-y-1.5">
            {tasks
              .filter((t) => t.plannedTime > 0)
              .map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span className="text-sm text-white/60">{t.title}</span>
                  <TimeBadge minutes={t.plannedTime} />
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Step 3 — Fill in your day (simplified calendar)
// ────────────────────────────────────────────────────────────

function SimpleCalendar({ tasks }: { tasks: PlanTask[] }) {
  // Project tasks from 9:00 AM
  let offsetMins = 0
  const blocks = tasks.map((t) => {
    const start = addMinutesToTime(9, 0, offsetMins)
    offsetMins += t.plannedTime || 30
    const end = addMinutesToTime(9, 0, offsetMins)
    return { ...t, start, end }
  })

  return (
    <div className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4 overflow-y-auto max-h-72">
      <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
        Your day
      </p>
      <div className="space-y-1.5">
        {blocks.map((b) => (
          <div
            key={b.id}
            className="bg-[#78614a]/30 border border-[#78614a]/40 rounded px-3 py-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/80 truncate">
                {b.title}
              </span>
              <span className="text-[10px] font-mono text-white/40 flex-shrink-0 ml-2">
                {b.start}
              </span>
            </div>
          </div>
        ))}
        {blocks.length === 0 && (
          <p className="text-sm text-white/20 italic">Add tasks to see your day</p>
        )}
      </div>
      {/* Shutdown time widget */}
      <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">Shutdown time</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/70">5:00 PM</span>
            <a href="#" className="text-xs text-[#4ade80] hover:underline">
              Add to calendar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step3({ tasks }: { tasks: PlanTask[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">
        Fill in your day
      </h2>
      <p className="text-sm text-white/40 mb-5">
        Here&apos;s how your tasks fit into the day.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Task list */}
        <div className="w-full sm:w-56 flex-shrink-0">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">
            Tasks
          </p>
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 bg-[#1a1a1a] rounded px-3 py-2"
              >
                <span className="text-sm text-white/80 truncate">{t.title}</span>
                {t.plannedTime > 0 && <TimeBadge minutes={t.plannedTime} />}
              </li>
            ))}
          </ul>
        </div>
        {/* Calendar */}
        <SimpleCalendar tasks={tasks} />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Step 4 — Prioritize (drag to reorder)
// ────────────────────────────────────────────────────────────

function SortableTaskRow({
  task,
  onTogglePriority,
}: {
  task: PlanTask
  onTogglePriority: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-white/25 hover:text-white/60 flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex-1 text-sm text-white truncate">{task.title}</span>
      {task.plannedTime > 0 && <TimeBadge minutes={task.plannedTime} />}
      <button
        onClick={() => onTogglePriority(task.id)}
        className={`flex-shrink-0 transition-colors ${
          task.priority ? 'text-[#f59e0b]' : 'text-white/20 hover:text-white/50'
        }`}
        aria-label={task.priority ? 'Remove priority' : 'Mark as priority'}
      >
        <Star size={15} fill={task.priority ? '#f59e0b' : 'none'} />
      </button>
    </li>
  )
}

function Step4({
  tasks,
  onReorder,
  onTogglePriority,
}: {
  tasks: PlanTask[]
  onReorder: (tasks: PlanTask[]) => void
  onTogglePriority: (id: string) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over.id)
      onReorder(arrayMove(tasks, oldIndex, newIndex))
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">
        Prioritize your tasks
      </h2>
      <p className="text-sm text-white/40 mb-5">
        Drag to reorder. Star your most important tasks.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {tasks.map((t) => (
              <SortableTaskRow
                key={t.id}
                task={t}
                onTogglePriority={onTogglePriority}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Step 5 — Schedule (calendar blocks)
// ────────────────────────────────────────────────────────────

const BLOCK_COLORS = [
  'bg-[#4ade80]/20 border-[#4ade80]/40 text-[#4ade80]',
  'bg-[#f59e0b]/20 border-[#f59e0b]/40 text-[#f59e0b]',
  'bg-[#60a5fa]/20 border-[#60a5fa]/40 text-[#60a5fa]',
  'bg-[#f472b6]/20 border-[#f472b6]/40 text-[#f472b6]',
  'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#a78bfa]',
]

function Step5({ tasks }: { tasks: PlanTask[] }) {
  let offsetMins = 0
  const blocks = tasks.map((t, i) => {
    const start = addMinutesToTime(9, 0, offsetMins)
    const dur = t.plannedTime || 30
    offsetMins += dur
    const end = addMinutesToTime(9, 0, offsetMins)
    return { ...t, start, end, colorClass: BLOCK_COLORS[i % BLOCK_COLORS.length] }
  })

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">
        Your schedule
      </h2>
      <p className="text-sm text-white/40 mb-5">
        Tasks auto-projected from 9:00 AM.
      </p>
      <div className="space-y-2">
        {blocks.map((b) => (
          <div
            key={b.id}
            className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${b.colorClass}`}
          >
            <span className="text-xs font-mono opacity-70 flex-shrink-0 w-24">
              {b.start} – {b.end}
            </span>
            <span className="flex-1 text-sm font-medium truncate">{b.title}</span>
            <TimeBadge minutes={b.plannedTime} />
          </div>
        ))}
        {blocks.length === 0 && (
          <p className="text-sm text-white/20 italic text-center py-8">
            Add tasks to see your schedule
          </p>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Step 6 — Daily plan document
// ────────────────────────────────────────────────────────────

function Step6({
  tasks,
  obstacles,
  onObstaclesChange,
  onShare,
}: {
  tasks: PlanTask[]
  obstacles: string
  onObstaclesChange: (v: string) => void
  onShare: () => void
}) {
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-white mb-1">
        Planned for today
      </h2>
      <p className="text-sm text-white/40 mb-5">
        Your daily plan is ready. Review and share it.
      </p>

      {/* Task bullet list */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-4">
        {tasks.length === 0 ? (
          <p className="text-sm text-white/30 italic">No tasks planned</p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span className="text-white/30">•</span>
                <span className="flex-1 text-white/80">{t.title}</span>
                {t.plannedTime > 0 && (
                  <span className="text-white/40 font-mono text-[11px]">
                    ({formatMinutes(t.plannedTime)})
                  </span>
                )}
                {t.priority && (
                  <Star size={12} className="text-[#f59e0b]" fill="#f59e0b" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Obstacles textarea */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-2">
          Obstacles in my way
        </label>
        <textarea
          value={obstacles}
          onChange={(e) => onObstaclesChange(e.target.value)}
          placeholder="What might get in your way today?"
          rows={3}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#4ade80]/50 transition-colors resize-none"
        />
      </div>

      {/* Share button */}
      <button
        onClick={onShare}
        className="flex items-center gap-2 text-sm text-white/60 hover:text-white/90 border border-[#2a2a2a] rounded-lg px-4 py-2 transition-colors hover:border-[#4a4a4a]"
      >
        <Share2 size={14} />
        Share plan
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Wizard
// ────────────────────────────────────────────────────────────

export function DailyPlanningWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [planTasks, setPlanTasks] = useState<PlanTask[]>([])
  const [obstacles, setObstacles] = useState('')
  const nextIdRef = useRef(1)

  function addTask(title: string) {
    setPlanTasks((prev) => [
      ...prev,
      {
        id: String(nextIdRef.current++),
        title,
        plannedTime: 0,
        priority: false,
      },
    ])
  }

  function setEstimate(id: string, minutes: number) {
    setPlanTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, plannedTime: minutes } : t)),
    )
  }

  function togglePriority(id: string) {
    setPlanTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: !t.priority } : t)),
    )
  }

  const handleShare = useCallback(() => {
    const lines = planTasks
      .map((t) => `• ${t.title}${t.plannedTime > 0 ? ` (${formatMinutes(t.plannedTime)})` : ''}`)
      .join('\n')
    const text = `Planned for today:\n${lines}${obstacles ? `\n\nObstacles in my way:\n${obstacles}` : ''}`
    navigator.clipboard.writeText(text).catch(() => {})
  }, [planTasks, obstacles])

  function handleFinish() {
    router.push('/board')
  }

  const canGoNext = () => {
    if (step === 1) return planTasks.length > 0
    return true
  }

  const stepTitles = [
    'Add tasks',
    'Estimate time',
    'Fill your day',
    'Prioritize',
    'Schedule',
    'Review & share',
  ]

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 bg-[#0f0f0f]/90 flex items-center justify-center p-2 sm:p-4">
      {/* Modal card */}
      <div className="relative w-full max-w-3xl bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 sm:p-8 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Close / X */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
          aria-label="Close wizard"
        >
          <X size={18} />
        </button>

        {/* Step label */}
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-2">
          Step {step} of 6 — {stepTitles[step - 1]}
        </p>

        {/* Progress bar */}
        <ProgressBar step={step} />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {step === 1 && (
            <Step1 tasks={planTasks} onAddTask={addTask} />
          )}
          {step === 2 && (
            <Step2 tasks={planTasks} onEstimate={setEstimate} />
          )}
          {step === 3 && (
            <Step3 tasks={planTasks} />
          )}
          {step === 4 && (
            <Step4
              tasks={planTasks}
              onReorder={setPlanTasks}
              onTogglePriority={togglePriority}
            />
          )}
          {step === 5 && (
            <Step5 tasks={planTasks} />
          )}
          {step === 6 && (
            <Step6
              tasks={planTasks}
              obstacles={obstacles}
              onObstaclesChange={setObstacles}
              onShare={handleShare}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#2a2a2a]">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white border border-[#2a2a2a] hover:border-[#4a4a4a] rounded-lg px-4 py-2 transition-colors"
            >
              <ChevronLeft size={15} />
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext()}
              className={`flex items-center gap-1.5 text-sm rounded-lg px-5 py-2 font-medium transition-all ${
                canGoNext()
                  ? 'bg-[#4ade80] text-black hover:bg-[#22c55e]'
                  : 'bg-[#2a2a2a] text-white/30 cursor-not-allowed'
              }`}
            >
              Next
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 text-sm bg-[#4ade80] text-black hover:bg-[#22c55e] rounded-lg px-5 py-2 font-medium transition-colors"
            >
              Get started
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
