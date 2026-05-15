'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Check,
  GripVertical,
  Star,
  Share2,
  ChevronRight,
  ChevronLeft,
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
import {
  Modal,
  Stepper,
  Button,
  TextInput,
  Slider,
  Textarea,
  Group,
  Stack,
  Box,
  Text,
} from '@mantine/core'

// ────────────────────────────────────────────────────────────
// Types & helpers
// ────────────────────────────────────────────────────────────

interface PlanTask {
  id: string
  title: string
  plannedTime: number  // minutes
  priority: boolean
}

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

function TimeBadge({ minutes }: { minutes: number }) {
  return (
    <span className="text-[11px] font-mono bg-[#2a2a2a] text-white/60 px-2 py-0.5 rounded flex-shrink-0">
      {formatMinutes(minutes)}
    </span>
  )
}

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
    <div className="flex gap-6">
      <div className="flex-1">
        <Text size="lg" fw={600} mb={4}>
          What&apos;s on your plate today?
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Add the tasks you need to get done. Press Enter to add each one.
        </Text>
        <TextInput
          data-autofocus
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you need to get done today?"
          size="md"
        />
        <Text size="xs" c="dimmed" mt={6}>
          Press Enter to add
        </Text>
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

  if (!task) {
    return (
      <Text ta="center" c="dimmed" py="xl">
        No tasks to estimate yet. Go back and add some.
      </Text>
    )
  }

  return (
    <Box maw={560} mx="auto">
      <Text size="lg" fw={600} mb={4}>
        Estimate your time
      </Text>
      <Text size="sm" c="dimmed" mb="lg">
        How long will this take? Drag to set.
      </Text>

      {/* Task card with time badge */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{task.title}</span>
        <TimeBadge minutes={sliderValue} />
      </div>

      <Slider
        value={sliderValue}
        onChange={(val) => {
          setSliderValue(val)
          onEstimate(task.id, val)
        }}
        min={0}
        max={480}
        step={5}
        color="accent"
        size="md"
        thumbSize={18}
        marks={[
          { value: 0, label: '0 min' },
          { value: 360, label: '6 hr' },
          { value: 480, label: '8 hr' },
        ]}
        label={(v) => formatMinutes(v)}
      />

      {/* Estimated list */}
      {tasks.filter((t) => t.plannedTime > 0).length > 0 && (
        <Box mt="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>
            Estimated
          </Text>
          <Stack gap={6}>
            {tasks
              .filter((t) => t.plannedTime > 0)
              .map((t) => (
                <Group key={t.id} justify="space-between">
                  <Text size="sm" c="dimmed">{t.title}</Text>
                  <TimeBadge minutes={t.plannedTime} />
                </Group>
              ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

// ────────────────────────────────────────────────────────────
// Step 3 — Fill in your day (simplified calendar)
// ────────────────────────────────────────────────────────────

function SimpleCalendar({ tasks }: { tasks: PlanTask[] }) {
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
      <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">Shutdown time</span>
          <span className="text-xs font-mono text-white/70">5:00 PM</span>
        </div>
      </div>
    </div>
  )
}

function Step3({ tasks }: { tasks: PlanTask[] }) {
  return (
    <div>
      <Text size="lg" fw={600} mb={4}>
        Fill in your day
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Here&apos;s how your tasks fit into the day.
      </Text>
      <div className="flex gap-4">
        <div className="w-56 flex-shrink-0">
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
      <Text size="lg" fw={600} mb={4}>
        Prioritize your tasks
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Drag to reorder. Star your most important tasks.
      </Text>
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
      <Text size="lg" fw={600} mb={4}>
        Your schedule
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Tasks auto-projected from 9:00 AM.
      </Text>
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
          <Text ta="center" c="dimmed" py="lg" fs="italic">
            Add tasks to see your schedule
          </Text>
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
    <Box maw={560} mx="auto">
      <Text size="lg" fw={600} mb={4}>
        Planned for today
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Your daily plan is ready. Review and share it.
      </Text>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-4">
        {tasks.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">No tasks planned</Text>
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

      <Textarea
        label="Obstacles in my way"
        value={obstacles}
        onChange={(e) => onObstaclesChange(e.currentTarget.value)}
        placeholder="What might get in your way today?"
        minRows={3}
        autosize
        mb="md"
      />

      <Button
        variant="default"
        leftSection={<Share2 size={14} />}
        onClick={onShare}
      >
        Share plan
      </Button>
    </Box>
  )
}

// ────────────────────────────────────────────────────────────
// Main Wizard
// ────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Add tasks',
  'Estimate',
  'Fill day',
  'Prioritize',
  'Schedule',
  'Review',
]

export function DailyPlanningWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [planTasks, setPlanTasks] = useState<PlanTask[]>([])
  const [obstacles, setObstacles] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
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

  function handleClose() {
    router.push('/board')
  }

  async function handleFinish() {
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd')

      let offsetMins = 0
      const tasksToCreate = planTasks.map((t, i) => {
        const startMins = 9 * 60 + offsetMins
        const dur = t.plannedTime || 30
        const scheduledTime = `${String(Math.floor(startMins / 60)).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`
        offsetMins += dur
        return {
          title: t.title,
          startDate: todayStr,
          plannedTime: t.plannedTime,
          priority: t.priority ? 'high' : 'normal',
          scheduledTime,
          sortOrder: i,
        }
      })

      const results = await Promise.all(
        tasksToCreate.map((task) =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
          }),
        ),
      )
      const failed = results.find((r) => !r.ok)
      if (failed) {
        throw new Error(`Task save failed (${failed.status})`)
      }

      if (obstacles.trim()) {
        const planRes = await fetch('/api/daily-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: todayStr, obstacles: obstacles.trim() }),
        })
        if (!planRes.ok) throw new Error(`Daily plan save failed (${planRes.status})`)
      }

      router.push('/board')
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save plan')
      setSaving(false)
    }
  }

  const canGoNext = () => {
    if (step === 1) return planTasks.length > 0
    return true
  }

  return (
    <Modal
      opened
      onClose={handleClose}
      size="xl"
      centered
      withCloseButton
      closeOnClickOutside={false}
      closeOnEscape
      trapFocus
      returnFocus
      overlayProps={{ backgroundOpacity: 0.65, blur: 2 }}
      title={
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.15em' }}>
          Daily planning
        </Text>
      }
      styles={{
        body: { padding: '1.25rem 1.5rem 1.5rem' },
      }}
    >
      <Stepper
        active={step - 1}
        onStepClick={(idx) => {
          // Only allow jumping back, or forward when canGoNext from current step
          if (idx + 1 <= step) setStep(idx + 1)
        }}
        size="xs"
        color="accent"
        mb="xl"
      >
        {STEP_LABELS.map((label) => (
          <Stepper.Step key={label} label={label} />
        ))}
      </Stepper>

      <Box mih={320}>
        {step === 1 && <Step1 tasks={planTasks} onAddTask={addTask} />}
        {step === 2 && <Step2 tasks={planTasks} onEstimate={setEstimate} />}
        {step === 3 && <Step3 tasks={planTasks} />}
        {step === 4 && (
          <Step4
            tasks={planTasks}
            onReorder={setPlanTasks}
            onTogglePriority={togglePriority}
          />
        )}
        {step === 5 && <Step5 tasks={planTasks} />}
        {step === 6 && (
          <Step6
            tasks={planTasks}
            obstacles={obstacles}
            onObstaclesChange={setObstacles}
            onShare={handleShare}
          />
        )}
      </Box>

      <Group
        justify="space-between"
        pt="md"
        mt="lg"
        style={{ borderTop: '1px solid #2a2a2a' }}
      >
        {step > 1 ? (
          <Button
            variant="default"
            leftSection={<ChevronLeft size={15} />}
            onClick={() => setStep((s) => s - 1)}
          >
            Previous
          </Button>
        ) : (
          <span />
        )}

        {step < 6 ? (
          <Button
            color="accent"
            rightSection={<ChevronRight size={15} />}
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            Next
          </Button>
        ) : (
          <Group gap="md">
            {saveError && (
              <Text size="xs" c="red">{saveError}</Text>
            )}
            <Button
              color="accent"
              rightSection={saving ? undefined : <ChevronRight size={15} />}
              onClick={handleFinish}
              loading={saving}
              disabled={planTasks.length === 0}
              leftSection={!saving && planTasks.length > 0 ? <Check size={15} /> : undefined}
            >
              {saving ? 'Saving…' : 'Get started'}
            </Button>
          </Group>
        )}
      </Group>
    </Modal>
  )
}
