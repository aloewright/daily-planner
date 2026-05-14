'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfDay } from 'date-fns'
import { Sunset, Check, ArrowRight } from 'lucide-react'
import { mapApiTaskToTask, type ApiTask } from '@/lib/mapTask'
import type { Task } from '@/types/index'

export default function ShutdownPage() {
  const router = useRouter()
  const today = startOfDay(new Date())
  const todayStr = format(today, 'yyyy-MM-dd')

  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([])
  const [intention, setIntention] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch(
          `/api/tasks?startDate=${todayStr}&endDate=${todayStr}`
        )
        if (!res.ok) return
        const apiTasks: ApiTask[] = await res.json()
        const mapped = apiTasks.map(mapApiTaskToTask)
        setCompletedTasks(mapped.filter((t) => t.status === 'done'))
        setIncompleteTasks(mapped.filter((t) => t.status !== 'done'))
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [todayStr])

  async function handleShutdown() {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, intention }),
      })
      router.push('/highlights')
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full overflow-auto px-6 py-8">
      <div className="w-full max-w-[600px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Sunset size={20} className="text-amber-400" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">End of day</h1>
            <p className="text-sm text-white/40">{format(today, 'EEEE, MMMM d')}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]" />
            ))}
          </div>
        ) : (
          <>
            {/* Section 1: Completed */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider text-[11px]">
                What you accomplished today
              </h2>
              {completedTasks.length === 0 ? (
                <div className="text-sm text-white/25 italic py-2">No completed tasks yet.</div>
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
                      <span className="text-sm text-[#4ade80] line-through opacity-80">
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Section 2: Rolling over */}
            {incompleteTasks.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider text-[11px]">
                  Rolling over to tomorrow
                </h2>
                <div className="flex flex-col gap-2">
                  {incompleteTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 opacity-50"
                    >
                      <span className="text-sm text-white/60">{task.title}</span>
                      <span className="text-[11px] text-white/40 flex items-center gap-1 flex-shrink-0 ml-4">
                        <ArrowRight size={11} strokeWidth={2} />
                        Tomorrow
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 3: Tomorrow's intention */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider text-[11px]">
                Tomorrow&apos;s intention
              </h2>
              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="What's your main focus tomorrow?"
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#4ade80]/50 transition-colors resize-none"
              />
            </section>

            {/* CTA */}
            <button
              onClick={handleShutdown}
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-[#4ade80] text-black font-bold text-base flex items-center justify-center gap-2 hover:bg-[#4ade80]/90 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Wrapping up…' : 'Complete shutdown'}
              {!submitting && <ArrowRight size={18} strokeWidth={2.5} />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
