'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfDay, subDays, isSameDay } from 'date-fns'
import {
  Sunset,
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Archive,
  Trash2,
  Share2,
  Sparkles,
  Moon,
  TrendingUp,
} from 'lucide-react'
import { mapApiTaskToTask, type ApiTask } from '@/lib/mapTask'
import type { Task } from '@/types/index'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

type Decision = 'rollover' | 'backlog' | 'drop'
type EndOfDayMessage = 'daily-encouragement' | 'quiet' | 'weekly-pattern'

const STEP_TITLES = [
  'Review',
  'Decide',
  'Intention',
  'Recap',
] as const

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-1">
      {[1, 2, 3, 4].map((n) => {
        const done = step > n
        const current = step === n
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                done
                  ? 'w-6 bg-amber-400'
                  : current
                  ? 'w-8 bg-amber-400'
                  : 'w-6 bg-white/10'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}

function DecisionButton({
  active,
  onClick,
  icon,
  label,
  activeColor,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  activeColor: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded border transition-colors ${
        active
          ? activeColor
          : 'border-[#2a2a2a] text-white/40 hover:text-white/70 hover:border-[#3a3a3a]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function DailyEncouragement({
  completedCount,
  rolloverCount,
}: {
  completedCount: number
  rolloverCount: number
}) {
  let title = "That's a wrap"
  let body = 'Rest well — tomorrow is a fresh start.'

  if (completedCount === 0) {
    title = 'Some days are like that'
    body = 'Showing up is what counts. Tomorrow is yours.'
  } else if (completedCount >= 5) {
    title = 'A great day'
    body = `You finished ${completedCount} task${
      completedCount === 1 ? '' : 's'
    } today. Be proud — that adds up.`
  } else if (rolloverCount === 0) {
    title = 'Clean finish'
    body = `${completedCount} done, nothing carried over. Beautifully tidy.`
  } else {
    title = 'Solid day'
    body = `${completedCount} done, ${rolloverCount} for tomorrow. Steady progress.`
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-400" strokeWidth={2} />
        <span className="text-sm font-semibold text-amber-100">{title}</span>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{body}</p>
    </div>
  )
}

function QuietGoodnight() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Moon size={28} className="text-white/30" strokeWidth={1.5} />
      <p className="text-sm text-white/40 italic">Goodnight.</p>
    </div>
  )
}

function WeeklyPattern({
  weeklyCompleted,
  weeklyActiveDays,
  completedCount,
}: {
  weeklyCompleted: number
  weeklyActiveDays: number
  completedCount: number
}) {
  const avgPerActiveDay =
    weeklyActiveDays > 0 ? weeklyCompleted / weeklyActiveDays : 0
  const aboveAverage =
    weeklyActiveDays > 0 && completedCount > avgPerActiveDay

  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-[#60a5fa]" strokeWidth={2} />
        <span className="text-sm font-semibold text-white">This week</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            Completed
          </span>
          <span className="text-lg font-bold text-white tabular-nums">
            {weeklyCompleted}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            Active days
          </span>
          <span className="text-lg font-bold text-white tabular-nums">
            {weeklyActiveDays} / 7
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            Avg / day
          </span>
          <span className="text-lg font-bold text-white tabular-nums">
            {avgPerActiveDay.toFixed(1)}
          </span>
        </div>
      </div>
      {aboveAverage && (
        <p className="text-xs text-[#60a5fa]/80">
          Today was above your weekly average. Nice.
        </p>
      )}
    </div>
  )
}

export default function ShutdownPage() {
  const router = useRouter()
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayStr = format(today, 'yyyy-MM-dd')

  const [step, setStep] = useState(1)
  const [stepVisible, setStepVisible] = useState(true)
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([])
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [intention, setIntention] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [endOfDayMessage, setEndOfDayMessage] =
    useState<EndOfDayMessage>('daily-encouragement')
  const [weeklyCompleted, setWeeklyCompleted] = useState(0)
  const [weeklyActiveDays, setWeeklyActiveDays] = useState(0)

  // Fetch today's tasks + settings + weekly history
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const sevenDaysAgo = format(subDays(today, 6), 'yyyy-MM-dd')

        const [todayRes, settingsRes, weekRes] = await Promise.all([
          fetch(
            `/api/tasks?startDate=${todayStr}&endDate=${todayStr}&userId=${DEMO_USER_ID}`
          ),
          fetch('/api/settings'),
          fetch(
            `/api/tasks?completed=true&startDate=${sevenDaysAgo}&endDate=${todayStr}&userId=${DEMO_USER_ID}`
          ),
        ])

        if (cancelled) return

        if (todayRes.ok) {
          const apiTasks: ApiTask[] = await todayRes.json()
          const mapped = apiTasks.map(mapApiTaskToTask)
          const completed = mapped.filter((t) => t.status === 'done')
          const incomplete = mapped.filter((t) => t.status !== 'done')
          setCompletedTasks(completed)
          setIncompleteTasks(incomplete)
          // Default all incomplete tasks to rollover
          const defaults: Record<string, Decision> = {}
          for (const t of incomplete) defaults[t.id] = 'rollover'
          setDecisions(defaults)
        }

        if (settingsRes.ok) {
          const s = await settingsRes.json()
          const raw = s.endOfDayMessage as string | undefined
          if (
            raw === 'daily-encouragement' ||
            raw === 'quiet' ||
            raw === 'weekly-pattern'
          ) {
            setEndOfDayMessage(raw)
          }
        }

        if (weekRes.ok) {
          const apiTasks: ApiTask[] = await weekRes.json()
          // Exclude today so the metric reflects the prior week pattern
          const priorTasks = apiTasks.filter((t) => {
            if (!t.startDate) return false
            return !isSameDay(new Date(t.startDate), today)
          })
          setWeeklyCompleted(priorTasks.length)
          const activeDays = new Set(
            priorTasks
              .filter((t) => t.startDate)
              .map((t) => format(new Date(t.startDate as string), 'yyyy-MM-dd'))
          )
          setWeeklyActiveDays(activeDays.size)
        }
      } catch {
        // ignore — page degrades gracefully when offline
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [today, todayStr])

  function setDecision(id: string, decision: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: decision }))
  }

  function transitionTo(next: number) {
    if (next < 1 || next > 4) return
    setStepVisible(false)
    window.setTimeout(() => {
      setStep(next)
      setStepVisible(true)
    }, 160)
  }

  const rolloverCount = useMemo(
    () =>
      incompleteTasks.filter((t) => (decisions[t.id] ?? 'rollover') === 'rollover')
        .length,
    [incompleteTasks, decisions]
  )
  const backlogCount = useMemo(
    () => incompleteTasks.filter((t) => decisions[t.id] === 'backlog').length,
    [incompleteTasks, decisions]
  )
  const dropCount = useMemo(
    () => incompleteTasks.filter((t) => decisions[t.id] === 'drop').length,
    [incompleteTasks, decisions]
  )

  async function handleShutdown() {
    if (submitting) return
    setSubmitting(true)
    try {
      const payload = {
        date: todayStr,
        intention,
        decisions: incompleteTasks.map((t) => ({
          id: t.id,
          decision: decisions[t.id] ?? 'rollover',
        })),
      }
      await fetch('/api/shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setDone(true)
      // Allow the "done" state to render before navigating away
      window.setTimeout(() => router.push('/highlights'), 900)
    } catch {
      setSubmitting(false)
    }
  }

  function handleShareRecap() {
    const completedLines = completedTasks.map((t) => `• ${t.title}`).join('\n')
    const recap = [
      `Shutdown — ${format(today, 'EEEE, MMMM d')}`,
      '',
      `Completed (${completedTasks.length}):`,
      completedLines || '(none)',
      '',
      rolloverCount > 0 ? `Rolling to tomorrow: ${rolloverCount}` : null,
      backlogCount > 0 ? `Moved to backlog: ${backlogCount}` : null,
      dropCount > 0 ? `Dropped: ${dropCount}` : null,
      intention.trim() ? `\nTomorrow's intention:\n${intention.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard
      .writeText(recap)
      .then(() => {
        setShareCopied(true)
        window.setTimeout(() => setShareCopied(false), 1800)
      })
      .catch(() => {})
  }

  const hasIncomplete = incompleteTasks.length > 0
  const lastStep = 4

  return (
    <div className="flex h-full overflow-auto px-6 py-8">
      <div className="w-full max-w-[640px] mx-auto flex flex-col gap-7">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Sunset size={20} className="text-amber-400" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">End of day</h1>
            <p className="text-sm text-white/40">
              {format(today, 'EEEE, MMMM d')}
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-white/30 font-semibold">
            Step {step} · {STEP_TITLES[step - 1]}
          </span>
        </div>

        <ProgressDots step={step} />

        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]"
              />
            ))}
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-14 h-14 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
              <Check size={28} className="text-[#4ade80]" strokeWidth={2.5} />
            </div>
            <p className="text-base text-white/80">Shutdown complete.</p>
            <p className="text-sm text-white/40">Taking you to highlights…</p>
          </div>
        ) : (
          <div
            className={`flex flex-col gap-6 transition-all duration-150 ${
              stepVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-1'
            }`}
          >
            {/* ── Step 1: Review completed ── */}
            {step === 1 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider text-[11px]">
                  What you accomplished today
                </h2>
                {completedTasks.length === 0 ? (
                  <div className="text-sm text-white/30 italic py-4 px-4 bg-[#141414] border border-[#2a2a2a] rounded-lg">
                    No completed tasks today. That&apos;s okay — being honest
                    about the day is the point of shutdown.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#4ade80] flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-black" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-[#4ade80] line-through opacity-80 flex-1">
                          {task.title}
                        </span>
                        {task.actualMinutes != null && task.actualMinutes > 0 && (
                          <span className="text-[11px] text-white/35 font-mono">
                            {task.actualMinutes}m
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-white/40 pt-1">
                  {completedTasks.length} completed
                  {hasIncomplete
                    ? ` · ${incompleteTasks.length} to decide on next`
                    : ''}
                </p>
              </section>
            )}

            {/* ── Step 2: Decide on incomplete ── */}
            {step === 2 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider text-[11px]">
                  Decide on what&apos;s left
                </h2>
                {!hasIncomplete ? (
                  <div className="text-sm text-white/40 italic py-4 px-4 bg-[#141414] border border-[#2a2a2a] rounded-lg">
                    Nothing left undone. Inbox zero.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {incompleteTasks.map((task) => {
                      const d = decisions[task.id] ?? 'rollover'
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3"
                        >
                          <span
                            className={`text-sm flex-1 truncate ${
                              d === 'drop'
                                ? 'text-white/30 line-through'
                                : 'text-white/85'
                            }`}
                          >
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <DecisionButton
                              active={d === 'rollover'}
                              onClick={() => setDecision(task.id, 'rollover')}
                              icon={<ArrowRight size={11} strokeWidth={2.25} />}
                              label="Tomorrow"
                              activeColor="border-[#4ade80] text-[#4ade80] bg-[#4ade80]/10"
                            />
                            <DecisionButton
                              active={d === 'backlog'}
                              onClick={() => setDecision(task.id, 'backlog')}
                              icon={<Archive size={11} strokeWidth={2.25} />}
                              label="Backlog"
                              activeColor="border-amber-400 text-amber-400 bg-amber-400/10"
                            />
                            <DecisionButton
                              active={d === 'drop'}
                              onClick={() => setDecision(task.id, 'drop')}
                              icon={<Trash2 size={11} strokeWidth={2.25} />}
                              label="Drop"
                              activeColor="border-red-400 text-red-400 bg-red-400/10"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {hasIncomplete && (
                  <p className="text-xs text-white/40 pt-1 tabular-nums">
                    {rolloverCount} tomorrow · {backlogCount} backlog ·{' '}
                    {dropCount} drop
                  </p>
                )}
              </section>
            )}

            {/* ── Step 3: Intention ── */}
            {step === 3 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider text-[11px]">
                  Tomorrow&apos;s intention
                </h2>
                <p className="text-sm text-white/40 -mt-1">
                  One sentence. What&apos;s the main thing?
                </p>
                <textarea
                  autoFocus
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="Tomorrow I want to…"
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#4ade80]/50 transition-colors resize-none"
                />
              </section>
            )}

            {/* ── Step 4: Recap ── */}
            {step === 4 && (
              <section className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider text-[11px]">
                  Recap
                </h2>

                {endOfDayMessage === 'daily-encouragement' && (
                  <DailyEncouragement
                    completedCount={completedTasks.length}
                    rolloverCount={rolloverCount}
                  />
                )}
                {endOfDayMessage === 'weekly-pattern' && (
                  <WeeklyPattern
                    weeklyCompleted={weeklyCompleted}
                    weeklyActiveDays={weeklyActiveDays}
                    completedCount={completedTasks.length}
                  />
                )}
                {endOfDayMessage === 'quiet' && <QuietGoodnight />}

                {/* Recap details */}
                <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-white/40">
                      Completed
                    </span>
                    <span className="text-sm text-white/80 tabular-nums">
                      {completedTasks.length}
                    </span>
                  </div>
                  {hasIncomplete && (
                    <>
                      <div className="h-px bg-[#2a2a2a]" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-white/40">
                          Rolling to tomorrow
                        </span>
                        <span className="text-sm text-[#4ade80] tabular-nums">
                          {rolloverCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-white/40">
                          Moved to backlog
                        </span>
                        <span className="text-sm text-amber-400 tabular-nums">
                          {backlogCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-white/40">
                          Dropped
                        </span>
                        <span className="text-sm text-red-400 tabular-nums">
                          {dropCount}
                        </span>
                      </div>
                    </>
                  )}
                  {intention.trim() && (
                    <>
                      <div className="h-px bg-[#2a2a2a]" />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-white/40">
                          Tomorrow&apos;s intention
                        </span>
                        <span className="text-sm text-white/75 italic">
                          {intention.trim()}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleShareRecap}
                  className="self-start flex items-center gap-2 text-xs text-white/60 hover:text-white/90 border border-[#2a2a2a] hover:border-[#4a4a4a] rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Share2 size={13} strokeWidth={2} />
                  {shareCopied ? 'Copied!' : 'Share recap'}
                </button>
              </section>
            )}
          </div>
        )}

        {/* Footer nav (hidden during loading and the post-submit confirmation) */}
        {!loading && !done && (
          <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
            <button
              onClick={() => transitionTo(step - 1)}
              disabled={step === 1}
              className={`flex items-center gap-1.5 text-sm rounded-lg px-4 py-2 transition-colors ${
                step === 1
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white border border-[#2a2a2a] hover:border-[#4a4a4a]'
              }`}
            >
              <ChevronLeft size={15} />
              Back
            </button>

            {step < lastStep ? (
              <button
                onClick={() => transitionTo(step + 1)}
                className="flex items-center gap-1.5 text-sm rounded-lg px-5 py-2 font-medium bg-amber-400 text-black hover:bg-amber-300 transition-colors"
              >
                Next
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleShutdown}
                disabled={submitting}
                className="flex items-center gap-2 text-sm font-semibold rounded-lg px-5 py-2 bg-[#4ade80] text-black hover:bg-[#22c55e] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Wrapping up…' : 'Complete shutdown'}
                {!submitting && <ArrowRight size={15} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
