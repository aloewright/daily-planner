'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addWeeks, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
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
  Legend,
} from 'recharts'

interface ChannelData {
  channelId: string
  name: string
  color: string
  minutes: number
}

interface DayChannelData {
  name: string
  minutes: number
}

interface DayData {
  date: string
  totalMinutes: number
  byChannel: DayChannelData[]
}

interface CsvRow {
  date: string
  channel: string
  title: string
  plannedTime: number
  actualTime: number
}

interface AnalyticsResponse {
  totalMinutes: number
  byChannel: ChannelData[]
  byDay: DayData[]
  csvRows: CsvRow[]
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHours(mins: number): string {
  return (mins / 60).toFixed(1)
}

function formatWeekRange(weekStart: Date): string {
  const end = endOfWeek(weekStart, { weekStartsOn: 1 })
  return `${format(weekStart, 'MMM d')}–${format(end, 'd, yyyy')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: { value: number }) => s + (p.value ?? 0), 0)
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white/80">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatMinutes(p.value)}
        </p>
      ))}
      <p className="text-white/50 mt-1 pt-1 border-t border-white/10">Total: {formatMinutes(total)}</p>
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

export default function AnalyticsPage() {
  const [currentWeek, setCurrentWeek] = useState<Date>(() =>
    startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
  )
  const [includeWeekends, setIncludeWeekends] = useState(true)
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const weekStart = format(currentWeek, 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/analytics?startDate=${weekStart}&endDate=${weekEnd}&includeWeekends=${includeWeekends}`
      )
      if (res.ok) {
        const json: AnalyticsResponse = await res.json()
        setData(json)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd, includeWeekends])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const prevWeek = () => setCurrentWeek((w) => addWeeks(w, -1))
  const nextWeek = () => setCurrentWeek((w) => addWeeks(w, 1))

  function downloadCsv() {
    if (!data?.csvRows?.length) return
    const header = 'date,channel,title,plannedTime,actualTime\n'
    const rows = data.csvRows
      .map(
        (r) =>
          `${r.date},"${r.channel.replace(/"/g, '""')}","${r.title.replace(/"/g, '""')}",${r.plannedTime},${r.actualTime}`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${weekStart}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Build stacked bar chart data — one entry per day
  const allChannelNames = Array.from(
    new Set(data?.byDay?.flatMap((d) => d.byChannel.map((c) => c.name)) ?? [])
  )

  const barData = (data?.byDay ?? []).map((day) => {
    const entry: Record<string, string | number> = { day: format(new Date(day.date + 'T12:00:00'), 'EEE') }
    for (const ch of day.byChannel) {
      entry[ch.name] = ch.minutes
    }
    return entry
  })

  // Get color for channel name from byChannel
  const channelColorMap = new Map<string, string>()
  for (const ch of data?.byChannel ?? []) {
    channelColorMap.set(ch.name, ch.color)
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] overflow-auto">
      <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-white text-xl font-semibold tracking-tight">Analytics</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Date nav */}
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

            {/* Weekends toggle */}
            <button
              onClick={() => setIncludeWeekends((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                includeWeekends
                  ? 'border-[#4ade80] text-[#4ade80] bg-[#4ade80]/10'
                  : 'border-white/15 text-white/40 hover:border-white/25 hover:text-white/60'
              }`}
            >
              Weekends
            </button>

            {/* Download CSV */}
            <button
              onClick={downloadCsv}
              disabled={!data?.csvRows?.length}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-white/15 text-white/50 hover:border-white/25 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download size={13} />
              Download CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-6">
            <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
          </div>
        ) : !data || data.totalMinutes === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/25">
            <p className="text-sm">No completed tasks with tracked time this week</p>
          </div>
        ) : (
          <>
            {/* Weekly Totals */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-6">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-5">
                Weekly Totals
              </h2>
              <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                {/* Big number */}
                <div className="flex flex-col">
                  <span className="text-5xl font-bold text-white tabular-nums leading-none">
                    {formatHours(data.totalMinutes)}
                  </span>
                  <span className="text-white/40 text-sm mt-1">hours tracked</span>
                </div>

                {/* Donut */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1 w-full">
                  <div className="w-full max-w-[260px] sm:max-w-[45%] flex-shrink-0">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={data.byChannel}
                        dataKey="minutes"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {data.byChannel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 w-full">
                    {data.byChannel.map((ch) => (
                      <div key={ch.channelId} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ch.color }}
                        />
                        <span className="text-white/60 text-xs flex-1 truncate">{ch.name}</span>
                        <span className="text-white/50 text-xs tabular-nums">
                          {formatMinutes(ch.minutes)}
                        </span>
                        <span className="text-white/30 text-xs tabular-nums w-8 text-right">
                          {Math.round((ch.minutes / data.totalMinutes) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 sm:p-6">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-5">
                Daily Breakdown
              </h2>
              {barData.length === 0 ? (
                <p className="text-white/25 text-sm text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-white/50 text-xs">{value}</span>
                      )}
                    />
                    {allChannelNames.map((name) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        stackId="a"
                        fill={channelColorMap.get(name) ?? '#6b7280'}
                        radius={
                          name === allChannelNames[allChannelNames.length - 1]
                            ? [3, 3, 0, 0]
                            : [0, 0, 0, 0]
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
