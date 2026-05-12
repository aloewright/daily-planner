'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Check, Trash2, Plus } from 'lucide-react'

interface Objective {
  id: string
  text: string
  completed: boolean
  weekStart: string
}

function formatWeekRange(weekStart: Date): string {
  const end = endOfWeek(weekStart, { weekStartsOn: 1 })
  return `${format(weekStart, 'MMM d')}–${format(end, 'd, yyyy')}`
}

export default function WeeklyPlanPage() {
  const [currentWeek, setCurrentWeek] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  const weekStartStr = format(currentWeek, 'yyyy-MM-dd')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/weekly-objectives?weekStart=${weekStartStr}`)
      .then((r) => r.json() as Promise<Objective[]>)
      .then((data) => {
        setObjectives(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [weekStartStr])

  const prevWeek = () => setCurrentWeek((w) => addWeeks(w, -1))
  const nextWeek = () => setCurrentWeek((w) => addWeeks(w, 1))

  async function addObjective() {
    const trimmed = newText.trim()
    if (!trimmed) return

    const res = await fetch('/api/weekly-objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: weekStartStr, text: trimmed }),
    })
    if (res.ok) {
      const created: Objective = await res.json()
      setObjectives((prev) => [...prev, created])
      setNewText('')
    }
  }

  async function toggleCompleted(obj: Objective) {
    const updated = { ...obj, completed: !obj.completed }
    setObjectives((prev) => prev.map((o) => (o.id === obj.id ? updated : o)))
    await fetch(`/api/weekly-objectives/${obj.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !obj.completed }),
    })
  }

  function startEdit(obj: Objective) {
    setEditingId(obj.id)
    setEditingText(obj.text)
  }

  async function saveEdit(obj: Objective) {
    const trimmed = editingText.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    const updated = { ...obj, text: trimmed }
    setObjectives((prev) => prev.map((o) => (o.id === obj.id ? updated : o)))
    setEditingId(null)
    await fetch(`/api/weekly-objectives/${obj.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    })
  }

  async function deleteObjective(id: string) {
    setObjectives((prev) => prev.filter((o) => o.id !== id))
    await fetch(`/api/weekly-objectives/${id}`, { method: 'DELETE' })
  }

  const handleNewKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addObjective()
  }

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, obj: Objective) => {
    if (e.key === 'Enter') saveEdit(obj)
    if (e.key === 'Escape') setEditingId(null)
  }

  const completed = objectives.filter((o) => o.completed).length
  const total = objectives.length

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      <div className="flex flex-col gap-6 p-8 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-semibold tracking-tight">Weekly objectives</h1>
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
          </div>
          <p className="text-white/40 text-sm">What do you want to accomplish this week?</p>
          {total > 0 && (
            <p className="text-white/30 text-xs">
              {completed} of {total} completed
            </p>
          )}
        </div>

        {/* Objectives list */}
        <div className="flex flex-col gap-1">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : objectives.length === 0 ? (
            <p className="text-white/25 text-sm py-4 text-center">
              No objectives yet — add one below
            </p>
          ) : (
            objectives.map((obj) => (
              <div
                key={obj.id}
                className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-white/10 transition-colors"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleCompleted(obj)}
                  className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    obj.completed
                      ? 'bg-[#4ade80] border-[#4ade80]'
                      : 'border-white/20 hover:border-white/40 bg-transparent'
                  }`}
                  aria-label={obj.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {obj.completed && <Check size={12} className="text-black" strokeWidth={3} />}
                </button>

                {/* Text / edit */}
                {editingId === obj.id ? (
                  <input
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => saveEdit(obj)}
                    onKeyDown={(e) => handleEditKeyDown(e, obj)}
                    className="flex-1 bg-transparent text-white text-sm outline-none border-b border-white/20 focus:border-white/50 py-0.5"
                  />
                ) : (
                  <span
                    onClick={() => startEdit(obj)}
                    className={`flex-1 text-sm cursor-text select-none ${
                      obj.completed ? 'line-through text-white/30' : 'text-white/90'
                    }`}
                  >
                    {obj.text}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteObjective(obj.id)}
                  className="flex-shrink-0 p-1 rounded text-white/0 group-hover:text-white/30 hover:!text-white/60 transition-colors"
                  aria-label="Delete objective"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}

          {/* Add objective input */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-white/10 hover:border-white/20 transition-colors mt-1">
            <div className="flex-shrink-0 w-5 h-5 rounded-md border border-white/10 flex items-center justify-center">
              <Plus size={11} className="text-white/30" />
            </div>
            <input
              ref={newInputRef}
              type="text"
              placeholder="Add objective..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleNewKeyDown}
              className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/25 outline-none"
            />
            {newText.trim() && (
              <button
                onClick={addObjective}
                className="text-xs text-[#4ade80] hover:text-[#4ade80]/70 transition-colors"
              >
                Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
