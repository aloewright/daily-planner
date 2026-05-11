'use client'

import { useState, useEffect } from 'react'
import { format, subDays, startOfDay, isSameDay } from 'date-fns'
import { Feather } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { mapApiTaskToTask, type ApiTask } from '@/lib/mapTask'
import type { Task } from '@/types/index'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

interface DayGroup {
  date: Date
  tasks: Task[]
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

export default function HighlightsPage() {
  const [enabled, setEnabled] = useState(true)
  const [groups, setGroups] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [savingToggle, setSavingToggle] = useState(false)

  const today = startOfDay(new Date())
  const sevenDaysAgo = subDays(today, 7)
  const startStr = format(sevenDaysAgo, 'yyyy-MM-dd')
  const endStr = format(today, 'yyyy-MM-dd')

  // Load the highlights-enabled setting
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.highlightsEnabled === 'boolean') {
          setEnabled(data.highlightsEnabled)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch completed tasks for the past 7 days
  useEffect(() => {
    async function fetchHighlights() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/tasks?completed=true&startDate=${startStr}&endDate=${endStr}&userId=${DEMO_USER_ID}`
        )
        if (!res.ok) return
        const apiTasks: ApiTask[] = await res.json()
        const tasks = apiTasks.map(mapApiTaskToTask)

        // Group by day, from today backwards
        const dayGroups: DayGroup[] = []
        for (let i = 0; i <= 7; i++) {
          const day = subDays(today, i)
          const dayTasks = tasks.filter((t) => {
            if (!t.scheduledDate) return false
            return isSameDay(new Date(t.scheduledDate), day)
          })
          if (dayTasks.length > 0) {
            dayGroups.push({ date: day, tasks: dayTasks })
          }
        }
        setGroups(dayGroups)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchHighlights()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startStr, endStr])

  async function handleToggle(value: boolean) {
    setEnabled(value)
    setSavingToggle(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlightsEnabled: value }),
      })
    } catch {
      // ignore
    } finally {
      setSavingToggle(false)
    }
  }

  return (
    <div className="flex h-full overflow-auto px-6 py-8">
      <div className="w-full max-w-[640px] mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4ade80]/10 flex items-center justify-center">
              <Feather size={20} className="text-[#4ade80]" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Daily Highlights</h1>
              <p className="text-sm text-white/40">A journal of your completed work</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">{savingToggle ? 'Saving…' : 'Enable'}</span>
            <Toggle checked={enabled} onChange={handleToggle} label="Enable highlights" />
          </div>
        </div>

        {/* Content */}
        {!enabled ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <Feather size={22} className="text-white/20" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-white/30 text-center">
              Highlights are disabled. Toggle above to start tracking.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-6 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 bg-[#2a2a2a] rounded w-32 mb-1" />
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]" />
                ))}
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <Feather size={22} className="text-white/20" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-white/30 text-center">
              No highlights yet. Complete your first task to see it here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.date.toISOString()} className="flex flex-col gap-2">
                {/* Date header */}
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {isSameDay(group.date, today)
                      ? 'Today'
                      : isSameDay(group.date, subDays(today, 1))
                      ? 'Yesterday'
                      : format(group.date, 'EEEE, MMMM d')}
                  </h2>
                  <div className="flex-1 h-px bg-[#2a2a2a]" />
                  <span className="text-[11px] text-white/25">
                    {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Task list */}
                {group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-[#4ade80]/20 border border-[#4ade80]/40 flex-shrink-0" />
                      <span className="text-sm text-white/70 truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {task.actualMinutes != null && task.actualMinutes > 0 && (
                        <span className="text-[11px] text-white/35 font-mono">
                          {formatMinutes(task.actualMinutes)}
                        </span>
                      )}
                      {task.channel && (
                        <span className="text-[11px] text-amber-400/70">
                          #{task.channel.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
