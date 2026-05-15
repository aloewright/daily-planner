'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, ArrowLeft, ArrowRight, Check, Coffee } from 'lucide-react'

const TOTAL_SCREENS = 7

interface Selections {
  taskManagers: string[]
  workStartTime: string
  workEndTime: string
  planningTiming: string
}

const TASK_MANAGERS = [
  'Asana',
  'ClickUp',
  'GitHub',
  'Gmail',
  'Google Tasks',
  'Jira',
  'Linear',
  'Monday.com',
  'Notion',
  'Outlook',
  'Todoist',
  'Trello',
]

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_SCREENS }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-200 ${
            i + 1 === current
              ? 'w-6 h-2 bg-[#4ade80]'
              : i + 1 < current
              ? 'w-2 h-2 bg-[#4ade80]/40'
              : 'w-2 h-2 bg-white/15 border border-white/20'
          }`}
        />
      ))}
    </div>
  )
}

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-8">
      <div className="w-16 h-16 rounded-2xl bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
        <Coffee size={32} strokeWidth={2.25} className="text-black" />
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-white leading-tight">
          Make your daily planner work for you
        </h1>
        <p className="text-white/50 text-base leading-relaxed">
          The daily planner that respects your time and helps you get things done.
        </p>
      </div>
      <button
        onClick={onNext}
        className="flex items-center gap-2 px-8 py-3.5 bg-[#4ade80] text-black font-semibold rounded-xl text-base hover:bg-[#4ade80]/90 transition-colors"
      >
        Get started
        <ArrowRight size={18} />
      </button>
    </div>
  )
}

function TaskManagersScreen({
  selections,
  onToggle,
}: {
  selections: string[]
  onToggle: (name: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white">Which task managers do you use?</h2>
        <p className="text-white/45 text-sm">Select all that apply</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {TASK_MANAGERS.map((name) => {
          const selected = selections.includes(name)
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              className={`relative flex flex-col items-center gap-2 px-3 py-4 rounded-xl border transition-all text-sm font-medium ${
                selected
                  ? 'bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80]'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-white/60 hover:border-white/25 hover:text-white/80'
              }`}
            >
              {selected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#4ade80] flex items-center justify-center">
                  <Check size={10} className="text-black" />
                </div>
              )}
              <span className="text-xl select-none">
                {getAppEmoji(name)}
              </span>
              <span className="text-center leading-tight">{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getAppEmoji(name: string): string {
  const map: Record<string, string> = {
    Asana: '📋',
    ClickUp: '✅',
    GitHub: '🐙',
    Gmail: '📧',
    'Google Tasks': '☑️',
    Jira: '🔵',
    Linear: '◆',
    'Monday.com': '📅',
    Notion: '📝',
    Outlook: '📮',
    Todoist: '🎯',
    Trello: '🗂️',
  }
  return map[name] ?? '📦'
}

function CalendarScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white">Connect your calendar</h2>
        <p className="text-white/45 text-sm">
          See your schedule alongside your tasks for smarter planning
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {[
          { label: 'Add Google Calendar', icon: '📅' },
          { label: 'Add Outlook Calendar', icon: '📮' },
          { label: 'Add iCloud Calendar', icon: '☁️' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={onNext}
            className="flex items-center gap-3 px-5 py-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white/80 text-sm font-medium hover:border-white/30 hover:text-white hover:bg-[#222] transition-all text-left"
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
      <button
        onClick={onNext}
        className="text-white/35 text-sm hover:text-white/60 transition-colors text-center"
      >
        Skip for now →
      </button>
    </div>
  )
}

function WorkStartScreen({
  time,
  onTimeChange,
}: {
  time: string
  onTimeChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white">When does your workday start?</h2>
        <p className="text-white/45 text-sm">
          We&apos;ll use this to schedule your daily planning ritual
        </p>
      </div>
      <div className="flex justify-center">
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="text-5xl font-bold text-white bg-transparent border-0 outline-none tabular-nums text-center"
          style={{ colorScheme: 'dark' }}
        />
      </div>
    </div>
  )
}

function WorkEndScreen({
  time,
  onTimeChange,
}: {
  time: string
  onTimeChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white">When does your workday end?</h2>
        <p className="text-white/45 text-sm">
          We&apos;ll use this to schedule your shutdown ritual
        </p>
      </div>
      <div className="flex justify-center">
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="text-5xl font-bold text-white bg-transparent border-0 outline-none tabular-nums text-center"
          style={{ colorScheme: 'dark' }}
        />
      </div>
    </div>
  )
}

function PlanningTimingScreen({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white">When do you like to plan your day?</h2>
        <p className="text-white/45 text-sm">You can change this any time in settings</p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onChange('morning')}
          className={`flex items-center gap-4 px-6 py-5 rounded-xl border transition-all text-left ${
            value === 'morning'
              ? 'bg-[#4ade80]/10 border-[#4ade80]'
              : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-white/25'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              value === 'morning' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-white/10 text-white/50'
            }`}
          >
            <Sun size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={`font-semibold ${value === 'morning' ? 'text-[#4ade80]' : 'text-white/80'}`}
            >
              The start of the day
            </span>
            <span className="text-xs text-white/40">Plan each morning before diving in</span>
          </div>
          {value === 'morning' && (
            <div className="ml-auto w-5 h-5 rounded-full bg-[#4ade80] flex items-center justify-center">
              <Check size={12} className="text-black" />
            </div>
          )}
        </button>

        <button
          onClick={() => onChange('evening')}
          className={`flex items-center gap-4 px-6 py-5 rounded-xl border transition-all text-left ${
            value === 'evening'
              ? 'bg-[#4ade80]/10 border-[#4ade80]'
              : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-white/25'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              value === 'evening' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-white/10 text-white/50'
            }`}
          >
            <Moon size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={`font-semibold ${value === 'evening' ? 'text-[#4ade80]' : 'text-white/80'}`}
            >
              The night before
            </span>
            <span className="text-xs text-white/40">Prepare tomorrow&apos;s plan tonight</span>
          </div>
          {value === 'evening' && (
            <div className="ml-auto w-5 h-5 rounded-full bg-[#4ade80] flex items-center justify-center">
              <Check size={12} className="text-black" />
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

function FirstDayScreen({
  onPlanToday,
  onPlanTomorrow,
}: {
  onPlanToday: () => void
  onPlanTomorrow: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold text-white">Ready to start planning?</h2>
        <p className="text-white/50 text-base">
          You&apos;re all set. Let&apos;s get to work.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onPlanToday}
          className="w-full px-6 py-4 bg-[#4ade80] text-black font-semibold rounded-xl text-base hover:bg-[#4ade80]/90 transition-colors"
        >
          Plan today →
        </button>
        <button
          onClick={onPlanTomorrow}
          className="w-full px-6 py-4 bg-[#1a1a1a] border border-[#2a2a2a] text-white/70 font-medium rounded-xl text-base hover:border-white/30 hover:text-white/90 transition-colors"
        >
          Plan tomorrow →
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [screen, setScreen] = useState(1)
  const [selections, setSelections] = useState<Selections>({
    taskManagers: [],
    workStartTime: '09:00',
    workEndTime: '17:00',
    planningTiming: 'morning',
  })

  function toggleTaskManager(name: string) {
    setSelections((prev) => ({
      ...prev,
      taskManagers: prev.taskManagers.includes(name)
        ? prev.taskManagers.filter((t) => t !== name)
        : [...prev.taskManagers, name],
    }))
  }

  function next() {
    setScreen((s) => Math.min(s + 1, TOTAL_SCREENS))
  }

  function back() {
    setScreen((s) => Math.max(s - 1, 1))
  }

  async function finish() {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workStartTime: selections.workStartTime,
          workEndTime: selections.workEndTime,
          onboardingCompleted: true,
        }),
      })
    } catch {
      // ignore, still navigate
    }
    router.push('/board')
  }

  const showBack = screen > 1
  const showNext = screen < TOTAL_SCREENS && screen !== 1 && screen !== 3 && screen !== 7

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4">
      {/* Top bar */}
      <div className="w-full max-w-[560px] flex items-center justify-between mb-10">
        {showBack ? (
          <button
            onClick={back}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        ) : (
          <div />
        )}
        <ProgressDots current={screen} />
        <div className="w-14" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[560px] bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 md:p-10">
        {screen === 1 && <WelcomeScreen onNext={next} />}
        {screen === 2 && (
          <TaskManagersScreen
            selections={selections.taskManagers}
            onToggle={toggleTaskManager}
          />
        )}
        {screen === 3 && <CalendarScreen onNext={next} />}
        {screen === 4 && (
          <WorkStartScreen
            time={selections.workStartTime}
            onTimeChange={(v) => setSelections((p) => ({ ...p, workStartTime: v }))}
          />
        )}
        {screen === 5 && (
          <WorkEndScreen
            time={selections.workEndTime}
            onTimeChange={(v) => setSelections((p) => ({ ...p, workEndTime: v }))}
          />
        )}
        {screen === 6 && (
          <PlanningTimingScreen
            value={selections.planningTiming}
            onChange={(v) => setSelections((p) => ({ ...p, planningTiming: v }))}
          />
        )}
        {screen === 7 && (
          <FirstDayScreen onPlanToday={finish} onPlanTomorrow={finish} />
        )}
      </div>

      {/* Bottom next button (for screens that need it) */}
      {showNext && (
        <div className="w-full max-w-[560px] flex justify-end mt-6">
          <button
            onClick={next}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#4ade80] text-black font-semibold rounded-xl text-sm hover:bg-[#4ade80]/90 transition-colors"
          >
            Next
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
