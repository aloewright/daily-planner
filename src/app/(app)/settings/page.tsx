'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'

type Tab = 'general' | 'rituals' | 'channels' | 'ai'

interface UserSettings {
  timezone: string
  timeFormat: string
  startOfWeek: string
  countPlannedAsActual: boolean
  autoSortTasks: boolean
  dailyPlanningTime: string
  automatedDailyPlanning: boolean
  automatedShutdown: boolean
  endOfDayMessage: string
  weeklyPlanningDay: string
  weeklyPlanningTime: string
  aiChannelRecs: boolean
  aiTimerRecs: boolean
  aiSummaries: boolean
}

interface Channel {
  id: string
  name: string
  color: string
}

const defaultSettings: UserSettings = {
  timezone: 'America/New_York',
  timeFormat: '12h',
  startOfWeek: 'monday',
  countPlannedAsActual: false,
  autoSortTasks: false,
  dailyPlanningTime: '09:00',
  automatedDailyPlanning: false,
  automatedShutdown: false,
  endOfDayMessage: 'daily-encouragement',
  weeklyPlanningDay: 'monday',
  weeklyPlanningTime: '09:00',
  aiChannelRecs: true,
  aiTimerRecs: true,
  aiSummaries: false,
}

const WEEKDAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
]

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#2a2a2a] last:border-b-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-white/80">{label}</span>
        {description && <span className="text-xs text-white/35">{description}</span>}
      </div>
      <div className="flex items-center gap-2 ml-6 flex-shrink-0">{children}</div>
    </div>
  )
}

function ToggleGroup({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-md bg-[#1a1a1a] border border-[#2a2a2a] p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-[#4ade80] text-black'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function GeneralTab({
  settings,
  onChange,
}: {
  settings: UserSettings
  onChange: (key: keyof UserSettings, value: string | boolean) => void
}) {
  return (
    <div className="flex flex-col">
      <SettingRow label="Timezone">
        <input
          type="text"
          value={settings.timezone}
          onChange={(e) => onChange('timezone', e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white/80 w-52 focus:outline-none focus:border-[#4ade80]/50"
        />
      </SettingRow>
      <SettingRow label="Time format">
        <ToggleGroup
          value={settings.timeFormat}
          options={[
            { value: '12h', label: '12h' },
            { value: '24h', label: '24h' },
          ]}
          onChange={(v) => onChange('timeFormat', v)}
        />
      </SettingRow>
      <SettingRow label="Start of week">
        <ToggleGroup
          value={settings.startOfWeek}
          options={[
            { value: 'monday', label: 'Monday' },
            { value: 'sunday', label: 'Sunday' },
          ]}
          onChange={(v) => onChange('startOfWeek', v)}
        />
      </SettingRow>
      <SettingRow
        label="Count planned as actual"
        description="When no timer is tracked, use planned time as actual"
      >
        <Toggle
          checked={settings.countPlannedAsActual}
          onChange={(v) => onChange('countPlannedAsActual', v)}
        />
      </SettingRow>
      <SettingRow
        label="Auto-sort tasks"
        description="Automatically sort tasks by priority and due date"
      >
        <Toggle
          checked={settings.autoSortTasks}
          onChange={(v) => onChange('autoSortTasks', v)}
        />
      </SettingRow>
    </div>
  )
}

function RitualsTab({
  settings,
  onChange,
}: {
  settings: UserSettings
  onChange: (key: keyof UserSettings, value: string | boolean) => void
}) {
  return (
    <div className="flex flex-col">
      <SettingRow label="Daily planning time">
        <input
          type="time"
          value={settings.dailyPlanningTime}
          onChange={(e) => onChange('dailyPlanningTime', e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-[#4ade80]/50"
        />
      </SettingRow>
      <SettingRow
        label="Automated daily planning"
        description="Automatically open planning wizard at scheduled time"
      >
        <Toggle
          checked={settings.automatedDailyPlanning}
          onChange={(v) => onChange('automatedDailyPlanning', v)}
        />
      </SettingRow>
      <SettingRow
        label="Automated shutdown"
        description="Automatically trigger end-of-day flow at work end time"
      >
        <Toggle
          checked={settings.automatedShutdown}
          onChange={(v) => onChange('automatedShutdown', v)}
        />
      </SettingRow>
      <SettingRow label="End of day message">
        <div className="flex flex-col gap-2">
          {[
            { value: 'daily-encouragement', label: 'Daily encouragement' },
            { value: 'none', label: 'None' },
            { value: 'custom', label: 'Custom' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => onChange('endOfDayMessage', opt.value)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  settings.endOfDayMessage === opt.value
                    ? 'border-[#4ade80]'
                    : 'border-white/25'
                }`}
              >
                {settings.endOfDayMessage === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                )}
              </div>
              <span
                onClick={() => onChange('endOfDayMessage', opt.value)}
                className="text-sm text-white/70 cursor-pointer"
              >
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Weekly planning day">
        <select
          value={settings.weeklyPlanningDay}
          onChange={(e) => onChange('weeklyPlanningDay', e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-[#4ade80]/50"
        >
          {WEEKDAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </SettingRow>
      <SettingRow label="Weekly planning time">
        <input
          type="time"
          value={settings.weeklyPlanningTime}
          onChange={(e) => onChange('weeklyPlanningTime', e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-[#4ade80]/50"
        />
      </SettingRow>
    </div>
  )
}

function ChannelsTab() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelColor, setNewChannelColor] = useState('#6b7280')
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels')
      if (res.ok) {
        const data: Channel[] = await res.json()
        setChannels(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  async function createChannel() {
    const name = newChannelName.trim()
    if (!name) return
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newChannelColor }),
      })
      if (res.ok) {
        const ch: Channel = await res.json()
        setChannels((prev) => [...prev, ch])
        setNewChannelName('')
        setNewChannelColor('#6b7280')
      }
    } catch {
      // ignore
    }
  }

  async function deleteChannel(id: string) {
    try {
      const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      // ignore
    }
  }

  async function updateChannelColor(id: string, color: string) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 text-sm">
        Loading channels…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {channels.map((ch) => (
        <div
          key={ch.id}
          className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg"
        >
          <input
            type="color"
            value={ch.color}
            onChange={(e) => updateChannelColor(ch.id, e.target.value)}
            className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent p-0"
            style={{ accentColor: ch.color }}
          />
          <span className="text-white/70 text-sm flex-1">#{ch.name}</span>
          <button
            onClick={() => deleteChannel(ch.id)}
            className="text-white/25 hover:text-red-400 transition-colors p-1 rounded"
            aria-label={`Delete ${ch.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* Create channel */}
      <div className="flex items-center gap-2 mt-2">
        <input
          type="color"
          value={newChannelColor}
          onChange={(e) => setNewChannelColor(e.target.value)}
          className="w-8 h-8 rounded-md cursor-pointer border border-[#2a2a2a] bg-[#1a1a1a] p-0.5"
        />
        <input
          type="text"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createChannel()}
          placeholder="New channel name"
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-[#4ade80]/50"
        />
        <button
          onClick={createChannel}
          disabled={!newChannelName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#4ade80]/10 text-[#4ade80] text-sm font-medium hover:bg-[#4ade80]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[#4ade80]/20"
        >
          <Plus size={14} />
          Create
        </button>
      </div>
    </div>
  )
}

function AITab({
  settings,
  onChange,
}: {
  settings: UserSettings
  onChange: (key: keyof UserSettings, value: string | boolean) => void
}) {
  const items = [
    {
      key: 'aiChannelRecs' as const,
      label: 'Channel recommendations',
      description: 'Suggest the best channel for new tasks based on your history',
    },
    {
      key: 'aiTimerRecs' as const,
      label: 'Planned time recommendations',
      description: 'Suggest how long tasks will take based on similar past tasks',
    },
    {
      key: 'aiSummaries' as const,
      label: 'Automatic summaries',
      description: 'Generate end-of-day and weekly summaries of your work',
    },
  ]

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-4 border-b border-[#2a2a2a] last:border-b-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-white/80">{item.label}</span>
            <span className="text-xs text-white/35">{item.description}</span>
          </div>
          <div className="ml-6 flex-shrink-0">
            <Toggle
              checked={settings[item.key] as boolean}
              onChange={(v) => onChange(item.key, v)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json() as Promise<UserSettings>)
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch(() => {})
  }, [])

  const handleChange = useCallback(
    (key: keyof UserSettings, value: string | boolean) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  async function saveSettings() {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'rituals', label: 'Rituals' },
    { id: 'channels', label: 'Channels & Contexts' },
    { id: 'ai', label: 'AI' },
  ]

  return (
    <div className="flex h-full bg-[#0f0f0f] overflow-auto">
      <div className="flex gap-8 w-full max-w-4xl mx-auto px-8 py-8">
        {/* Left tab sidebar */}
        <aside className="flex flex-col gap-1 w-48 flex-shrink-0 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-2">
            Settings
          </p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1f1f1f] text-white font-medium'
                  : 'text-white/45 hover:text-white/70 hover:bg-[#1a1a1a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content area */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold text-white">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
            {activeTab !== 'channels' && (
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-4 py-1.5 rounded-md bg-[#4ade80] text-black text-sm font-semibold hover:bg-[#4ade80]/90 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
              </button>
            )}
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-6 py-2">
            {activeTab === 'general' && (
              <GeneralTab settings={settings} onChange={handleChange} />
            )}
            {activeTab === 'rituals' && (
              <RitualsTab settings={settings} onChange={handleChange} />
            )}
            {activeTab === 'channels' && <ChannelsTab />}
            {activeTab === 'ai' && (
              <AITab settings={settings} onChange={handleChange} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
