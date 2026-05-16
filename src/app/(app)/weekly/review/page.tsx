'use client'

import { useState, useEffect } from 'react'
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface DbTask {
  id: string
  title: string
  completed: boolean
  completedAt: string | null
  actualTime: number
  channel: { id: string; name: string; color: string } | null
}

interface DayData {
  date: Date
  label: string
  tasks: DbTask[]
}

interface BarDatum {
  day: string
  minutes: number
  color: string
}

interface PieDatum {
  name: string
  minutes: number
  color: string
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatWeekRange(weekStart: Date): string {
  const end = endOfWeek(weekStart, { weekStartsOn: 1 })
  return `${format(weekStart, 'MMM d')}–${format(end, 'd, yyyy')}`
}

const FALLBACK_COLOR = '#6b7280'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white/80">
      <p className="font-medium mb-0.5">{label}</p>
      <p>{formatMinutes(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white/80">
      <p className="font-medium">{payload[0]?.name}</p>
      <p>{formatMinutes(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

export default function WeeklyReviewPage() {
  const [currentWeek, setCurrentWeek] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [tasks, setTasks] = useState<DbTask[]>([])
  const [loading, setLoading] = useState(true)

  const weekStart = currentWeek
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    setLoading(true)
    const start = format(weekStart, 'yyyy-MM-dd')
    const end = format(weekEnd, 'yyyy-MM-dd')
    fetch(`/api/tasks?startDate=${start}&endDate=${end}`)
      .then((r) => r.json())
      .then((data: DbTask[]) => {
        const completed = Array.isArray(data) ? data.filter((t) => t.completed) : []
        setTasks(completed)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format(currentWeek, 'yyyy-MM-dd')])

  const prevWeek = () => setCurrentWeek((w) => addWeeks(w, -1))
  const nextWeek = () => setCurrentWeek((w) => addWeeks(w, 1))

  // Build per-day data
  const dayData: DayData[] = weekDays.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayTasks = tasks.filter((t) => {
      const d = t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd') : null
      return d === dateStr
    })
    return { date, label: format(date, 'EEE'), tasks: dayTasks }
  })

  // Bar chart data
  const barData: BarDatum[] = dayData.map((d) => {
    const primaryChannel = d.tasks.length > 0 ? d.tasks[0].channel : null
    return {
      day: d.label,
      minutes: d.tasks.reduce((s, t) => s + t.actualTime, 0),
      color: primaryChannel?.color ?? FALLBACK_COLOR,
    }
  })

  // Pie chart data
  const channelMap = new Map<string, PieDatum>()
  for (const task of tasks) {
    const key = task.channel?.id ?? '__none__'
    const name = task.channel?.name ?? 'Uncategorized'
    const color = task.channel?.color ?? FALLBACK_COLOR
    const existing = channelMap.get(key)
    if (existing) {
      existing.minutes += task.actualTime
    } else {
      channelMap.set(key, { name, minutes: task.actualTime, color })
    }
  }
  const pieData: PieDatum[] = Array.from(channelMap.values()).filter((d) => d.minutes > 0)

  const totalMinutes = tasks.reduce((s, t) => s + t.actualTime, 0)

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] overflow-auto">
      <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-white text-xl font-semibold tracking-tight">Weekly Review</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white/50 tabular-nums min-w-[140px] text-center">
              {formatWeekRange(currentWeek)}
            </span>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* What got done — per-day columns */}
        <div>
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
            What got done
          </h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          {loading ? (
            <div className="grid grid-cols-7 gap-2 sm:gap-3 min-w-[640px] sm:min-w-0">
              {weekDays.map((_, i) => (
                <div key={i} className="h-48 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 sm:gap-3 min-w-[640px] sm:min-w-0">
              {dayData.map((day) => (
                <div key={day.label} className="flex flex-col gap-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-white/40 text-xs font-medium">{day.label}</span>
                    <span className="text-white/20 text-[10px]">{format(day.date, 'd')}</span>
                  </div>
                  <div className="flex flex-col gap-1 min-h-[120px]">
                    {day.tasks.length === 0 ? (
                      <p className="text-white/15 text-[10px] text-center pt-4">—</p>
                    ) : (
                      day.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="px-2 py-1.5 rounded-md text-[10px] leading-tight text-white/70"
                          style={{
                            backgroundColor: task.channel?.color
                              ? `${task.channel.color}20`
                              : '#ffffff10',
                            borderLeft: `2px solid ${task.channel?.color ?? FALLBACK_COLOR}`,
                          }}
                        >
                          <p className="font-medium truncate">{task.title}</p>
                          {task.actualTime > 0 && (
                            <p className="text-white/40 mt-0.5">{formatMinutes(task.actualTime)}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Charts */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar chart: daily productivity */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                Daily Productivity
              </h3>
              {totalMinutes === 0 ? (
                <p className="text-white/25 text-sm text-center py-10">No time tracked this week</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${Math.round(v / 60)}h`}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="minutes" radius={[3, 3, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie chart: time by channel */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                How You Spent Your Time
              </h3>
              {pieData.length === 0 ? (
                <p className="text-white/25 text-sm text-center py-10">No time tracked this week</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="55%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="minutes"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 flex-1">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-white/60 text-xs truncate">{entry.name}</span>
                        <span className="text-white/40 text-xs ml-auto">
                          {Math.round((entry.minutes / totalMinutes) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
