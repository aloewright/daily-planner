'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Square, Check, ChevronDown, LogOut } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiSubtask {
  id: string
  title: string
  plannedTime: number
  actualTime: number
  completed: boolean
  sortOrder: number
  taskId: string
}

interface ApiTask {
  id: string
  title: string
  notes: string
  plannedTime: number
  actualTime: number
  completed: boolean
  subtasks: ApiSubtask[]
}

interface PersistedSession {
  mode: 'focus' | 'pomodoro'
  focusTaskId: string | null
  isRunning: boolean
  snapshotSeconds: number
  startedAt: number | null
  pomodoroPhase: 'work' | 'break'
  pomodoroCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'focus.session.v1'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTimer(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${pad(m)}:${pad(sec)}`
}

function formatMinutes(m: number): string {
  if (!m) return '--:--'
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h > 0) return `${h}:${pad(min)}`
  return `0:${pad(min)}`
}

function readPersisted(): PersistedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedSession>
    if (parsed.mode !== 'focus' && parsed.mode !== 'pomodoro') return null
    return {
      mode: parsed.mode,
      focusTaskId: typeof parsed.focusTaskId === 'string' ? parsed.focusTaskId : null,
      isRunning: !!parsed.isRunning,
      snapshotSeconds: typeof parsed.snapshotSeconds === 'number' ? parsed.snapshotSeconds : 0,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      pomodoroPhase: parsed.pomodoroPhase === 'break' ? 'break' : 'work',
      pomodoroCount: typeof parsed.pomodoroCount === 'number' ? parsed.pomodoroCount : 0,
    }
  } catch {
    return null
  }
}

function writePersisted(state: PersistedSession): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode errors */
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POMODORO_WORK_SECONDS = 25 * 60
const POMODORO_BREAK_SECONDS = 5 * 60

// ─── FocusPage ────────────────────────────────────────────────────────────────

export default function FocusPage() {
  const router = useRouter()

  // Mode
  const [mode, setMode] = useState<'focus' | 'pomodoro'>('focus')

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break'>('work')
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [notification, setNotification] = useState<string | null>(null)

  // Task selection
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  // Hydration tracking — keeps initial restore from clobbering persisted state
  const hydratedRef = useRef(false)

  // Derived selected task
  const focusTask = tasks.find((t) => t.id === focusTaskId) ?? null

  // Timer interval ref
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Hydrate from localStorage on mount ────────────────────────────────────
  useEffect(() => {
    const s = readPersisted()
    if (s) {
      setMode(s.mode)
      setFocusTaskId(s.focusTaskId)
      setPomodoroPhase(s.pomodoroPhase)
      setPomodoroCount(s.pomodoroCount)

      let restored = s.snapshotSeconds
      if (s.isRunning && s.startedAt != null) {
        const elapsed = Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000))
        restored = s.mode === 'focus'
          ? s.snapshotSeconds + elapsed
          : Math.max(0, s.snapshotSeconds - elapsed)
      }
      setSeconds(restored)
      if (s.isRunning) setIsRunning(true)
    }
    hydratedRef.current = true
  }, [])

  // ── Fetch today's tasks ───────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    setLoadingTasks(true)
    fetch(`/api/tasks?startDate=${today}&endDate=${today}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ApiTask[]) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false))
  }, [])

  // ── Init timer seconds when mode changes (after hydration only) ───────────
  useEffect(() => {
    if (!hydratedRef.current) return
    if (isRunning) stopTimer()
    if (mode === 'pomodoro') {
      setSeconds(POMODORO_WORK_SECONDS)
      setPomodoroPhase('work')
    } else {
      setSeconds(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ── Clear notification after 5s ───────────────────────────────────────────
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 5000)
    return () => clearTimeout(t)
  }, [notification])

  // ── Tick ─────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setSeconds((prev) => {
      if (mode === 'focus') {
        return prev + 1
      }
      // Pomodoro countdown
      if (prev <= 1) {
        // Phase transition — schedule outside setter
        return 0
      }
      return prev - 1
    })
  }, [mode])

  // Watch for pomodoro phase end (seconds hitting 0 while running)
  useEffect(() => {
    if (!isRunning || mode !== 'pomodoro' || seconds !== 0) return

    if (pomodoroPhase === 'work') {
      setPomodoroCount((c) => c + 1)
      setNotification('Time for a break!')
      setPomodoroPhase('break')
      setSeconds(POMODORO_BREAK_SECONDS)
    } else {
      setNotification('Break over — back to work!')
      setPomodoroPhase('work')
      setSeconds(POMODORO_WORK_SECONDS)
    }
  }, [isRunning, mode, seconds, pomodoroPhase])

  // ── Start / stop helpers ─────────────────────────────────────────────────
  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
    setIsRunning(true)
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }

  // Re-create interval when tick fn changes (mode change while running)
  useEffect(() => {
    if (!isRunning) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [tick, isRunning])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // ── Persist session state ────────────────────────────────────────────────
  // Snapshot seconds + startedAt only change at start/stop/phase boundaries.
  // We re-derive a fresh snapshot here whenever any persisted field changes,
  // so a reload always reconstructs the correct elapsed time.
  useEffect(() => {
    if (!hydratedRef.current) return
    const persisted: PersistedSession = {
      mode,
      focusTaskId,
      isRunning,
      // When running, snapshot is "seconds at this moment", and startedAt is now.
      // On reload, restored seconds = snapshot ± (now - startedAt).
      snapshotSeconds: seconds,
      startedAt: isRunning ? Date.now() : null,
      pomodoroPhase,
      pomodoroCount,
    }
    writePersisted(persisted)
  // We intentionally exclude `seconds` from deps: persisting on every tick is
  // wasteful, and snapshot+startedAt reconstruct it on reload. We re-snapshot
  // on the events that actually change the timeline (start/stop/mode/task/phase).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, focusTaskId, isRunning, pomodoroPhase, pomodoroCount])

  // ── beforeunload warning while timer is running ──────────────────────────
  useEffect(() => {
    if (!isRunning) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Required for older browsers — modern browsers show a generic prompt.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isRunning])

  // ── Commit actualTime for current focus session ──────────────────────────
  const commitActualTime = useCallback(async (taskId: string, elapsedSeconds: number) => {
    if (elapsedSeconds <= 0) return
    const minutes = Math.round(elapsedSeconds / 60)
    if (minutes <= 0) return
    const existing = tasks.find((t) => t.id === taskId)
    const totalMinutes = (existing?.actualTime ?? 0) + minutes
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualTime: totalMinutes }),
      })
    } catch {
      /* silently ignore */
    }
  }, [tasks])

  // ── Handle START / STOP ───────────────────────────────────────────────────
  async function handleToggle() {
    if (isRunning) {
      stopTimer()
      // For focus mode: persist actualTime to server
      if (mode === 'focus' && focusTaskId) {
        await commitActualTime(focusTaskId, seconds)
      }
    } else {
      if (mode === 'focus') {
        setSeconds(0)
      }
      startTimer()
      // Toggle timer on server for tracking
      if (focusTaskId) {
        fetch(`/api/tasks/${focusTaskId}/timer`, { method: 'POST' }).catch(() => {/* silently ignore */})
      }
    }
  }

  // ── Mode switch ───────────────────────────────────────────────────────────
  function handleModeSwitch(newMode: 'focus' | 'pomodoro') {
    if (newMode === mode) return
    setMode(newMode)
  }

  // ── Task select ───────────────────────────────────────────────────────────
  function handleSelectTask(id: string | null) {
    setFocusTaskId(id)
    setShowDropdown(false)
    if (isRunning) stopTimer()
    if (mode === 'focus') setSeconds(0)
    if (mode === 'pomodoro') {
      setSeconds(POMODORO_WORK_SECONDS)
      setPomodoroPhase('work')
    }
  }

  // ── Exit focus → stop timer, commit actualTime, navigate to /today ───────
  async function handleExit() {
    const wasRunning = isRunning
    const elapsed = seconds
    if (wasRunning) {
      stopTimer()
    }
    if (wasRunning && mode === 'focus' && focusTaskId) {
      await commitActualTime(focusTaskId, elapsed)
    }
    // Persist the selected task (so returning to /focus preserves selection),
    // but clear the running-timer fields.
    const persisted: PersistedSession = {
      mode,
      focusTaskId,
      isRunning: false,
      snapshotSeconds: 0,
      startedAt: null,
      pomodoroPhase: 'work',
      pomodoroCount,
    }
    writePersisted(persisted)
    router.push('/today')
  }

  // ── Timer label ───────────────────────────────────────────────────────────
  const timerDisplay = formatTimer(seconds)

  const pomodoroLabel = pomodoroPhase === 'work'
    ? `Work session ${pomodoroCount + 1}`
    : 'Break time'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] text-white">

      {/* ── Notification banner ──────────────────────────────────────────── */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#4ade80] text-black text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg transition-all">
          {notification}
        </div>
      )}

      {/* ── Top bar: mode tabs ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#1e1e1e] flex-shrink-0">
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
          <button
            onClick={() => handleModeSwitch('focus')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'focus'
                ? 'bg-[#4ade80] text-black'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Focus
          </button>
          <button
            onClick={() => handleModeSwitch('pomodoro')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'pomodoro'
                ? 'bg-[#4ade80] text-black'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Pomodoro
          </button>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'pomodoro' && (
            <div className="text-xs text-white/30">
              {pomodoroCount} session{pomodoroCount !== 1 ? 's' : ''} completed
            </div>
          )}
          <button
            onClick={handleExit}
            aria-label="Exit focus"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/60 hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <LogOut size={13} strokeWidth={2} />
            Exit focus
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 pb-8">

        {/* ── Task selector ──────────────────────────────────────────────── */}
        <div className="w-full max-w-lg relative">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-white/70 hover:border-[#3a3a3a] hover:text-white transition-colors"
          >
            <span className={focusTask ? 'text-white/90' : 'text-white/30'}>
              {loadingTasks
                ? 'Loading tasks...'
                : focusTask
                ? focusTask.title
                : 'Select a task to focus on'}
            </span>
            <ChevronDown size={14} className="text-white/30 flex-shrink-0" />
          </button>

          {showDropdown && !loadingTasks && (
            <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
              <button
                onClick={() => handleSelectTask(null)}
                className="w-full px-4 py-2.5 text-left text-sm text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors"
              >
                No task selected
              </button>
              {tasks.length === 0 ? (
                <div className="px-4 py-3 text-sm text-white/25">No tasks scheduled today</div>
              ) : (
                tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTask(t.id)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                      t.id === focusTaskId
                        ? 'bg-[#4ade80]/10 text-[#4ade80]'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                        t.completed
                          ? 'bg-[#4ade80] border-[#4ade80]'
                          : 'border-white/30'
                      }`}
                    >
                      {t.completed && <Check size={7} className="text-black" strokeWidth={3} />}
                    </span>
                    <span className={t.completed ? 'line-through text-white/30' : ''}>{t.title}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Task title + subtasks (shown when task selected) ───────────── */}
        {focusTask && (
          <div className="w-full max-w-lg space-y-4">
            {/* Title */}
            <h1 className="text-2xl font-bold text-white leading-snug">
              {focusTask.title}
            </h1>

            {/* Subtasks */}
            {focusTask.subtasks && focusTask.subtasks.length > 0 && (
              <div className="bg-[#141414] rounded-xl border border-[#1e1e1e] overflow-hidden">
                {/* Header */}
                <div className="flex items-center text-[9px] text-white/20 uppercase tracking-wider px-4 py-2 border-b border-[#1e1e1e] gap-2">
                  <span className="flex-1">Subtask</span>
                  <span className="w-12 text-right">Actual</span>
                  <span className="w-12 text-right">Planned</span>
                </div>
                {focusTask.subtasks
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1a1a] last:border-0"
                    >
                      <span
                        className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${
                          sub.completed
                            ? 'bg-[#4ade80] border-[#4ade80]'
                            : 'border-white/30'
                        }`}
                      >
                        {sub.completed && (
                          <Check size={8} className="text-black" strokeWidth={3} />
                        )}
                      </span>
                      <span
                        className={`flex-1 text-sm ${
                          sub.completed ? 'line-through text-white/30' : 'text-white/80'
                        }`}
                      >
                        {sub.title}
                      </span>
                      <span className="text-xs font-mono text-white/30 w-12 text-right">
                        {sub.actualTime ? formatMinutes(sub.actualTime) : '--:--'}
                      </span>
                      <span className="text-xs font-mono text-white/30 w-12 text-right">
                        {sub.plannedTime ? formatMinutes(sub.plannedTime) : '--:--'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── Timer display ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2">
          {mode === 'pomodoro' && (
            <div className={`text-xs font-medium uppercase tracking-widest ${
              pomodoroPhase === 'break' ? 'text-amber-400' : 'text-[#4ade80]'
            }`}>
              {pomodoroLabel}
            </div>
          )}
          <div
            className="text-6xl font-mono font-semibold text-white tabular-nums"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {timerDisplay}
          </div>
          {mode === 'focus' && isRunning && (
            <div className="text-xs text-white/30">elapsed time</div>
          )}
        </div>

        {/* ── START / STOP button ─────────────────────────────────────────── */}
        <button
          onClick={handleToggle}
          className={`h-14 px-8 rounded-xl flex items-center gap-3 text-base font-semibold transition-all ${
            isRunning
              ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
              : 'bg-[#4ade80] text-black hover:bg-[#22c55e]'
          }`}
        >
          {isRunning ? (
            <>
              <Square size={18} strokeWidth={2} />
              Stop
            </>
          ) : (
            <>
              <Play size={18} strokeWidth={2} fill="currentColor" />
              Start
            </>
          )}
        </button>

        {/* ── Notes (read-only) ───────────────────────────────────────────── */}
        {focusTask?.notes && focusTask.notes.trim() && focusTask.notes !== '<p></p>' && (
          <div className="w-full max-w-lg">
            <div className="text-[9px] text-white/20 uppercase tracking-wider mb-2">Notes</div>
            <div
              className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap bg-[#141414] rounded-xl border border-[#1e1e1e] px-4 py-3"
              dangerouslySetInnerHTML={{ __html: focusTask.notes }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
