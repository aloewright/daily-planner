'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, addWeeks, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Flame } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
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

interface TrendsWeek {
  weekStart: string
  label: string
  totalMinutes: number
  plannedMinutes: number
  byChannel: { name: string; color: string; minutes: number }[]
}

interface TrendsChannel {
  name: string
  color: string
  totalMinutes: number
}

interface TrendsData {
  anchorDate: string
  weeks: number
  streak: { current: number; longest: number; lookbackDays: number }
  weekly: TrendsWeek[]
  channels: TrendsChannel[]
  heatmap: number[][]
}

interface AnalyticsResponse {
  totalMinutes: number
  byChannel: ChannelData[]
  byDay: DayData[]
  csvRows: CsvRow[]
  trends?: TrendsData
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

  const trends = data?.trends
  const trendsChannelNames = useMemo(
    () => trends?.channels.map((c) => c.name) ?? [],
    [trends]
  )
  const trendsChannelColors = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of trends?.channels ?? []) m.set(c.name, c.color)
    return m
  }, [trends])

  const trendsLineData = useMemo(() => {
    if (!trends) return []
    return trends.weekly.map((wk) => {
      const entry: Record<string, string | number> = { week: wk.label }
      const byCh = new Map(wk.byChannel.map((c) => [c.name, c.minutes]))
      for (const name of trendsChannelNames) {
        entry[name] = byCh.get(name) ?? 0
      }
      return entry
    })
  }, [trends, trendsChannelNames])

  const accuracyData = useMemo(() => {
    if (!trends) return []
    return trends.weekly.map((wk) => ({
      week: wk.label,
      planned: wk.plannedMinutes,
      actual: wk.totalMinutes,
      accuracy:
        wk.plannedMinutes > 0
          ? Math.round((wk.totalMinutes / wk.plannedMinutes) * 100)
          : null,
    }))
  }, [trends])

  const heatmapMax = useMemo(() => {
    if (!trends) return 0
    let m = 0
    for (const row of trends.heatmap) for (const v of row) if (v > m) m = v
    return m
  }, [trends])

  const dowLabels = useMemo(() => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [])

  // Most-productive day-of-week and hour-of-day summaries
  const heatmapSummary = useMemo(() => {
    if (!trends) return null
    const dowTotals = trends.heatmap.map((row) => row.reduce((s, v) => s + v, 0))
    const hourTotals = Array(24).fill(0) as number[]
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) hourTotals[h] += trends.heatmap[d][h]
    let topDow = 0
    dowTotals.forEach((v, i) => {
      if (v > dowTotals[topDow]) topDow = i
    })
    let topHour = 0
    hourTotals.forEach((v, i) => {
      if (v > hourTotals[topHour]) topHour = i
    })
    const total = dowTotals.reduce((s, v) => s + v, 0)
    return {
      topDow: dowLabels[topDow],
      topDowMinutes: dowTotals[topDow],
      topHour,
      topHourMinutes: hourTotals[topHour],
      total,
    }
  }, [trends, dowLabels])

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] overflow-auto">
      <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold tracking-tight">Analytics</h1>
          <div className="flex items-center gap-3">
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
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-5">
                Weekly Totals
              </h2>
              <div className="flex items-center gap-8">
                {/* Big number */}
                <div className="flex flex-col">
                  <span className="text-5xl font-bold text-white tabular-nums leading-none">
                    {formatHours(data.totalMinutes)}
                  </span>
                  <span className="text-white/40 text-sm mt-1">hours tracked</span>
                </div>

                {/* Donut */}
                <div className="flex items-center gap-6 flex-1">
                  <ResponsiveContainer width="45%" height={160}>
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
                  <div className="flex flex-col gap-2 flex-1">
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
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
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

        {trends && (
          <>
            {/* Streak + Trends header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <div className="flex items-center gap-2 text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                  <Flame size={14} className="text-orange-400" />
                  Current streak
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white tabular-nums leading-none">
                    {trends.streak.current}
                  </span>
                  <span className="text-white/40 text-sm">
                    day{trends.streak.current === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-white/30 text-xs mt-2">
                  Consecutive days with ≥1 completed task
                </p>
              </div>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <div className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                  Longest streak
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white tabular-nums leading-none">
                    {trends.streak.longest}
                  </span>
                  <span className="text-white/40 text-sm">
                    day{trends.streak.longest === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-white/30 text-xs mt-2">
                  In the last {trends.streak.lookbackDays} days
                </p>
              </div>

              {heatmapSummary && heatmapSummary.total > 0 ? (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                  <div className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                    Peak time
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white tabular-nums leading-none">
                        {heatmapSummary.topDow}
                      </span>
                      <span className="text-white/40 text-xs">
                        ({formatMinutes(heatmapSummary.topDowMinutes)})
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-white tabular-nums leading-none">
                        {String(heatmapSummary.topHour).padStart(2, '0')}:00
                      </span>
                      <span className="text-white/40 text-xs">
                        ({formatMinutes(heatmapSummary.topHourMinutes)})
                      </span>
                    </div>
                  </div>
                  <p className="text-white/30 text-xs mt-2">
                    Most productive day &amp; hour
                  </p>
                </div>
              ) : (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                  <div className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                    Peak time
                  </div>
                  <p className="text-white/30 text-xs">No data in trend window</p>
                </div>
              )}
            </div>

            {/* Channel time series (last 8 weeks) */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-5">
                Channel time series · last {trends.weeks} weeks
              </h2>
              {trendsChannelNames.length === 0 ? (
                <p className="text-white/25 text-sm text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendsLineData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="week"
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
                    <Tooltip content={<BarTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-white/50 text-xs">{value}</span>
                      )}
                    />
                    {trendsChannelNames.map((name) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={trendsChannelColors.get(name) ?? '#6b7280'}
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Planned vs Actual accuracy */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-5">
                Planned vs actual · last {trends.weeks} weeks
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={accuracyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="week"
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
                  <Tooltip content={<AccuracyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-white/50 text-xs">{value}</span>
                    )}
                  />
                  <Bar dataKey="planned" name="Planned" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#4ade80" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-2 text-[10px]">
                {accuracyData.map((wk) => (
                  <div
                    key={wk.week}
                    className="rounded-md border border-white/5 px-2 py-1.5 text-center"
                  >
                    <div className="text-white/40">{wk.week}</div>
                    <div className="text-white/80 tabular-nums">
                      {wk.accuracy === null ? '—' : `${wk.accuracy}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap: day-of-week × hour-of-day */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-5">
                Productivity heatmap · last {trends.weeks} weeks
              </h2>
              {heatmapMax === 0 ? (
                <p className="text-white/25 text-sm text-center py-8">No data</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[2px] mb-1">
                      <div />
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div
                          key={h}
                          className="text-[9px] text-white/30 text-center tabular-nums"
                        >
                          {h % 3 === 0 ? h : ''}
                        </div>
                      ))}
                    </div>
                    {dowLabels.map((dow, di) => (
                      <div
                        key={dow}
                        className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[2px] mb-[2px]"
                      >
                        <div className="text-[10px] text-white/40 self-center">{dow}</div>
                        {Array.from({ length: 24 }).map((_, h) => {
                          const v = trends.heatmap[di][h]
                          const intensity = heatmapMax > 0 ? v / heatmapMax : 0
                          const bg =
                            v === 0
                              ? 'rgba(255,255,255,0.03)'
                              : `rgba(74,222,128,${Math.max(0.1, intensity * 0.85)})`
                          return (
                            <div
                              key={h}
                              className="h-5 rounded-[2px]"
                              style={{ backgroundColor: bg }}
                              title={`${dow} ${String(h).padStart(2, '0')}:00 — ${formatMinutes(v)}`}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AccuracyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const planned = payload.find((p: { dataKey: string }) => p.dataKey === 'planned')?.value ?? 0
  const actual = payload.find((p: { dataKey: string }) => p.dataKey === 'actual')?.value ?? 0
  const accuracy = planned > 0 ? Math.round((actual / planned) * 100) : null
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white/80">
      <p className="font-medium mb-1">{label}</p>
      <p style={{ color: '#3b82f6' }}>Planned: {formatMinutes(planned)}</p>
      <p style={{ color: '#4ade80' }}>Actual: {formatMinutes(actual)}</p>
      {accuracy !== null && (
        <p className="text-white/50 mt-1 pt-1 border-t border-white/10">
          Accuracy: {accuracy}%
        </p>
      )}
    </div>
  )
}
