'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { QuickPanel } from './QuickPanel'

interface ObjectivesPanelProps {
  open: boolean
  onClose: () => void
}

interface Objective {
  id: string
  text: string
  completed: boolean
  weekStart: string
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day // Monday-based week
  const monday = new Date(now)
  monday.setDate(monday.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export function ObjectivesPanel({ open, onClose }: ObjectivesPanelProps) {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(false)
  const [newText, setNewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const weekStart = getWeekStart()

  const fetchObjectives = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-objectives?weekStart=${weekStart}`)
      if (res.ok) setObjectives(await res.json())
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    if (open) fetchObjectives()
  }, [open, fetchObjectives])

  async function addObjective(e: React.FormEvent) {
    e.preventDefault()
    const text = newText.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, text }),
      })
      if (res.ok) {
        const created: Objective = await res.json()
        setObjectives((prev) => [...prev, created])
        setNewText('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleComplete(obj: Objective) {
    // Optimistic
    setObjectives((prev) =>
      prev.map((o) => (o.id === obj.id ? { ...o, completed: !o.completed } : o)),
    )
    const res = await fetch(`/api/weekly-objectives/${obj.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !obj.completed }),
    })
    if (!res.ok) {
      // Revert on failure
      setObjectives((prev) =>
        prev.map((o) => (o.id === obj.id ? { ...o, completed: obj.completed } : o)),
      )
    }
  }

  return (
    <QuickPanel open={open} title="Weekly Objectives" onClose={onClose}>
      <div className="p-3">
        <form onSubmit={addObjective} className="flex gap-2 mb-3">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add an objective…"
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#4ade80]"
          />
          <button
            type="submit"
            disabled={!newText.trim() || submitting}
            className="bg-[#4ade80] text-black rounded-md px-2 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Add"
          >
            <Plus size={14} />
          </button>
        </form>

        {loading && (
          <p className="text-xs text-white/30 text-center py-6">Loading…</p>
        )}
        {!loading && objectives.length === 0 && (
          <div className="flex flex-col items-center py-10 text-white/30">
            <Target size={20} className="mb-2" />
            <p className="text-xs">No objectives yet this week</p>
          </div>
        )}
        <ul className="space-y-1">
          {objectives.map((obj) => (
            <li key={obj.id}>
              <button
                onClick={() => toggleComplete(obj)}
                className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[#1f1f1f] text-left transition-colors"
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                    obj.completed
                      ? 'bg-[#4ade80] border-[#4ade80]'
                      : 'border-[#3a3a3a]'
                  }`}
                >
                  {obj.completed && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-6"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm ${
                    obj.completed ? 'text-white/40 line-through' : 'text-white'
                  }`}
                >
                  {obj.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </QuickPanel>
  )
}
