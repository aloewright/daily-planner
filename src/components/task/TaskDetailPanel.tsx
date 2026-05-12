'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  X,
  Maximize2,
  MoreHorizontal,
  MapPin,
  Calendar,
  Plus,
  Play,
  Square,
  Check,
  Hash,
  Paperclip,
  ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTasksStore } from '@/store/tasks'
import { useTask } from '@/hooks/useTask'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function formatMinutes(m: number): string {
  if (!m) return '--:--'
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}`
  return `0:${String(min).padStart(2, '0')}`
}

function formatCommentTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, h:mm a')
  } catch {
    return dateStr
  }
}

// ─── ApiTask shape (mirrors what the API returns) ─────────────────────────────

interface ApiSubtask {
  id: string
  title: string
  plannedTime: number
  actualTime: number
  completed: boolean
  sortOrder: number
  taskId: string
}

interface ApiComment {
  id: string
  body: string
  taskId: string
  userId: string
  createdAt: string
  user?: { id: string; name: string | null; email: string }
}

interface ApiChannel {
  id: string
  name: string
  color: string
}

interface ApiTaskDetail {
  id: string
  title: string
  description: string
  notes: string
  channelId: string | null
  channel: ApiChannel | null
  startDate: string | null
  dueDate: string | null
  plannedTime: number
  actualTime: number
  completed: boolean
  priority: string
  subtasks: ApiSubtask[]
  comments: ApiComment[]
  createdAt: string
  updatedAt: string
}

// ─── SubtaskRow ───────────────────────────────────────────────────────────────

function SubtaskRow({
  subtask,
  onToggle,
  onDelete,
  onTitleSave,
}: {
  subtask: ApiSubtask
  onToggle: () => void
  onDelete: () => void
  onTitleSave: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(subtask.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleBlur() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== subtask.title) {
      onTitleSave(draft.trim())
    } else {
      setDraft(subtask.title)
    }
  }

  return (
    <div className="group flex items-center gap-2 py-1.5 px-1 rounded hover:bg-white/5">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
          subtask.completed
            ? 'bg-[#4ade80] border-[#4ade80]'
            : 'border-white/30 hover:border-white/60'
        }`}
      >
        {subtask.completed && <Check size={9} className="text-black" strokeWidth={3} />}
      </button>

      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') inputRef.current?.blur()
            if (e.key === 'Escape') {
              setDraft(subtask.title)
              setEditing(false)
            }
          }}
          className="flex-1 bg-transparent text-sm text-white outline-none border-b border-white/30 pb-0.5"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-text ${
            subtask.completed ? 'line-through text-white/40' : 'text-white/80'
          }`}
        >
          {subtask.title}
        </span>
      )}

      {/* Time columns */}
      <span className="text-xs font-mono text-white/30 w-12 text-right">
        {subtask.actualTime ? formatMinutes(subtask.actualTime) : '--:--'}
      </span>
      <span className="text-xs font-mono text-white/30 w-12 text-right">
        {subtask.plannedTime ? formatMinutes(subtask.plannedTime) : '--:--'}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-opacity ml-1"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── CommentRow ───────────────────────────────────────────────────────────────

function CommentRow({ comment }: { comment: ApiComment }) {
  const initial = comment.user?.name?.[0]?.toUpperCase() ?? comment.user?.email?.[0]?.toUpperCase() ?? '?'
  return (
    <div className="flex gap-3 py-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-black text-xs font-bold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-medium text-white/80">
            {comment.user?.name ?? comment.user?.email ?? 'User'}
          </span>
          <span className="text-[10px] text-white/30">{formatCommentTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">{comment.body}</p>
      </div>
    </div>
  )
}

// ─── TaskDetailPanel ──────────────────────────────────────────────────────────

export function TaskDetailPanel() {
  const selectedTaskId = useTasksStore((s) => s.selectedTaskId)
  const selectTask = useTasksStore((s) => s.selectTask)
  const updateTask = useTasksStore((s) => s.updateTask)
  const activeTimer = useTasksStore((s) => s.activeTimer)
  const timerSeconds = useTasksStore((s) => s.timerSeconds)
  const startTimer = useTasksStore((s) => s.startTimer)
  const stopTimer = useTasksStore((s) => s.stopTimer)

  const queryClient = useQueryClient()
  const { data: task, isLoading } = useTask(selectedTaskId) as { data: ApiTaskDetail | null | undefined; isLoading: boolean }

  // Local state mirrors the fetched task for optimistic UI
  const [titleDraft, setTitleDraft] = useState('')
  const [subtasks, setSubtasks] = useState<ApiSubtask[]>([])
  const [comments, setComments] = useState<ApiComment[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newCommentBody, setNewCommentBody] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [channels, setChannels] = useState<ApiChannel[]>([])

  const titleInputRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const newSubtaskRef = useRef<HTMLInputElement>(null)

  // ── Tiptap notes editor ──────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Add notes...' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[80px] focus:outline-none text-white/80 text-sm leading-relaxed',
      },
    },
    onBlur: ({ editor: e }) => {
      if (!selectedTaskId) return
      const html = e.getHTML()
      patchTask({ notes: html })
    },
  })

  // ── Sync local state when task loads ─────────────────────────────────────
  useEffect(() => {
    if (task) {
      setTitleDraft(task.title)
      setSubtasks(task.subtasks ?? [])
      setComments(task.comments ?? [])
      // Only set editor content if editor is ready and content differs
      if (editor && task.notes !== undefined) {
        editor.commands.setContent(task.notes || '')
      }
    }
  // Include task to re-sync when subtasks/comments change after server updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, task?.subtasks?.length, task?.comments?.length])

  // Update timer running state
  useEffect(() => {
    setIsTimerRunning(activeTimer === selectedTaskId)
  }, [activeTimer, selectedTaskId])

  // ── Fetch channels once on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch('/api/channels')
      .then((r) => (r.ok ? r.json() as Promise<ApiChannel[]> : []))
      .then((data) => setChannels(Array.isArray(data) ? data : []))
      .catch(() => {/* silently ignore */})
  }, [])

  // ── Keyboard close ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const active = document.activeElement
        const isEditing = active instanceof HTMLInputElement ||
                          active instanceof HTMLTextAreaElement ||
                          active?.getAttribute('contenteditable') === 'true'
        if (!isEditing) selectTask(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectTask])

  // ── PATCH helper ─────────────────────────────────────────────────────────
  const patchTask = useCallback(
    async (data: Record<string, unknown>) => {
      if (!selectedTaskId) return
      try {
        const res = await fetch(`/api/tasks/${selectedTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) return
        const updated = await res.json() as ApiTaskDetail
        // Sync zustand store
        updateTask(selectedTaskId, {
          title: updated.title,
          estimatedMinutes: updated.plannedTime ?? undefined,
          actualMinutes: updated.actualTime ?? undefined,
        })
        // Invalidate react-query cache
        queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      } catch (err) {
        console.error('[patchTask]', err)
      }
    },
    [selectedTaskId, updateTask, queryClient]
  )

  // ── Title save ───────────────────────────────────────────────────────────
  async function handleTitleBlur() {
    if (!titleDraft.trim() || titleDraft === task?.title) return
    setSavingTitle(true)
    await patchTask({ title: titleDraft.trim() })
    setSavingTitle(false)
  }

  // ── Completion toggle ────────────────────────────────────────────────────
  async function handleToggleComplete() {
    if (!task) return
    await patchTask({ completed: !task.completed })
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  async function handleTimerToggle() {
    if (!selectedTaskId) return
    if (isTimerRunning) {
      stopTimer()
      // Save accumulated seconds → minutes to API
      const minutes = Math.round(timerSeconds / 60)
      await patchTask({ actualTime: minutes })
    } else {
      startTimer(selectedTaskId)
    }
  }

  // ── Add subtask ───────────────────────────────────────────────────────────
  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim() || !selectedTaskId) return
    try {
      const res = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId, title: newSubtaskTitle.trim() }),
      })
      if (!res.ok) return
      const newSub = await res.json() as ApiSubtask
      setSubtasks((prev) => [...prev, newSub])
      setNewSubtaskTitle('')
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] })
    } catch (err) {
      console.error('[addSubtask]', err)
    }
  }

  // ── Toggle subtask ────────────────────────────────────────────────────────
  async function handleToggleSubtask(subtask: ApiSubtask) {
    try {
      const res = await fetch(`/api/subtasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !subtask.completed }),
      })
      if (!res.ok) return
      const updated = await res.json() as ApiSubtask
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? updated : s)))
    } catch (err) {
      console.error('[toggleSubtask]', err)
    }
  }

  // ── Delete subtask ────────────────────────────────────────────────────────
  async function handleDeleteSubtask(id: string) {
    try {
      const response = await fetch(`/api/subtasks/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        toast.error('Failed to delete subtask')
        return
      }
      setSubtasks((prev) => prev.filter((s) => s.id !== id))
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] })
    } catch (err) {
      console.error('[deleteSubtask]', err)
      toast.error('Failed to delete subtask')
    }
  }

  // ── Update subtask title ──────────────────────────────────────────────────
  async function handleSubtaskTitleSave(id: string, title: string) {
    try {
      const res = await fetch(`/api/subtasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) return
      const updated = await res.json() as ApiSubtask
      setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch (err) {
      console.error('[updateSubtaskTitle]', err)
    }
  }

  // ── Add comment ───────────────────────────────────────────────────────────
  async function handleAddComment() {
    if (!newCommentBody.trim() || !selectedTaskId) return
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId, body: newCommentBody.trim() }),
      })
      if (!res.ok) return
      const newComment = await res.json() as ApiComment
      setComments((prev) => [...prev, newComment])
      setNewCommentBody('')
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] })
    } catch (err) {
      console.error('[addComment]', err)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const isOpen = !!selectedTaskId

  return (
    <>
      {/* Backdrop (subtle) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => selectTask(null)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-[640px] max-w-full bg-[#141414] border-l border-[#2a2a2a] z-50 flex flex-col overflow-hidden transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white/30 text-sm">
              {isLoading ? 'Loading...' : 'Select a task'}
            </div>
          </div>
        ) : (
          <>
            {/* ── HEADER ROW ─────────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 px-4 pt-4 pb-2 flex-shrink-0 flex-wrap">
              {/* Channel badge + picker */}
              <div className="relative">
                <button
                  onClick={() => setShowChannelPicker((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 transition-colors"
                >
                  <Hash size={10} />
                  {task.channel?.name ?? 'No channel'}
                  <ChevronDown size={10} className="text-amber-400/60" />
                </button>

                {showChannelPicker && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                    {channels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => {
                          patchTask({ channelId: ch.id })
                          setShowChannelPicker(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ch.color }}
                        />
                        {ch.name}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        patchTask({ channelId: null })
                        setShowChannelPicker(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors text-left border-t border-[#2a2a2a]"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#6b7280]" />
                      No channel
                    </button>
                  </div>
                )}
              </div>

              {/* Location */}
              <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors">
                <MapPin size={11} />
                None
              </button>

              {/* Start date */}
              <button
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
                title="Start date"
              >
                Start Today
              </button>

              {/* Due date */}
              <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors">
                <Calendar size={11} />
                {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'Due'}
              </button>

              {/* Add subtask shortcut */}
              <button
                onClick={() => newSubtaskRef.current?.focus()}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
              >
                <Plus size={11} />
                Subtask
              </button>

              <div className="ml-auto flex items-center gap-1">
                {/* More options */}
                <button className="p-1.5 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
                  <MoreHorizontal size={16} />
                </button>

                {/* Expand */}
                <button className="p-1.5 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
                  <Maximize2 size={15} />
                </button>

                {/* Close */}
                <button
                  onClick={() => selectTask(null)}
                  className="p-1.5 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── TITLE ROW ──────────────────────────────────────────── */}
            <div className="flex items-start gap-3 px-4 py-2 flex-shrink-0">
              {/* Completion circle */}
              <button
                onClick={handleToggleComplete}
                className={`flex-shrink-0 mt-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  task.completed
                    ? 'bg-[#4ade80] border-[#4ade80]'
                    : 'border-white/30 hover:border-white/60'
                }`}
              >
                {task.completed && <Check size={11} className="text-black" strokeWidth={3} />}
              </button>

              {/* Title */}
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') titleInputRef.current?.blur()
                }}
                disabled={savingTitle}
                className={`flex-1 bg-transparent text-xl font-semibold text-white outline-none resize-none leading-snug placeholder:text-white/20 ${
                  task.completed ? 'line-through text-white/40' : ''
                }`}
                placeholder="Task title..."
              />

              {/* Time columns + timer */}
              <div className="flex-shrink-0 flex items-center gap-3 mt-1">
                <div className="text-right">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Actual</div>
                  <div className="text-xs font-mono text-white/60">
                    {isTimerRunning ? formatSeconds(timerSeconds) : formatMinutes(task.actualTime)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Planned</div>
                  <div className="text-xs font-mono text-white/60">{formatMinutes(task.plannedTime)}</div>
                </div>
                <button
                  onClick={handleTimerToggle}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isTimerRunning
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-[#4ade80]/10 text-[#4ade80] hover:bg-[#4ade80]/20'
                  }`}
                >
                  {isTimerRunning ? <Square size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {/* ── SCROLLABLE BODY ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-0">
              {/* SUBTASKS */}
              <div className="py-3">
                {subtasks.length > 0 && (
                  <div className="mb-1">
                    {/* Sub-header row */}
                    <div className="flex items-center text-[9px] text-white/20 uppercase tracking-wider px-1 mb-1 gap-2">
                      <span className="flex-1">Subtask</span>
                      <span className="w-12 text-right">Actual</span>
                      <span className="w-12 text-right">Planned</span>
                      <span className="w-4" />
                    </div>
                    {subtasks.map((sub) => (
                      <SubtaskRow
                        key={sub.id}
                        subtask={sub}
                        onToggle={() => handleToggleSubtask(sub)}
                        onDelete={() => handleDeleteSubtask(sub.id)}
                        onTitleSave={(title) => handleSubtaskTitleSave(sub.id, title)}
                      />
                    ))}
                  </div>
                )}

                {/* Add subtask input */}
                <div className="flex items-center gap-2 px-1 py-1">
                  <Plus size={13} className="text-white/30 flex-shrink-0" />
                  <input
                    ref={newSubtaskRef}
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubtask()
                      if (e.key === 'Escape') setNewSubtaskTitle('')
                    }}
                    placeholder="Add subtask..."
                    className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 outline-none"
                  />
                </div>
              </div>

              {/* DIVIDER */}
              <div className="border-t border-[#2a2a2a]" />

              {/* NOTES */}
              <div className="py-4">
                <div className="text-[9px] text-white/20 uppercase tracking-wider mb-2">Notes</div>
                <EditorContent editor={editor} />
              </div>

              {/* DIVIDER */}
              <div className="border-t border-[#2a2a2a]" />

              {/* COMMENTS */}
              <div className="py-4">
                <div className="text-[9px] text-white/20 uppercase tracking-wider mb-3">Comments</div>

                {/* Comment input */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-black text-xs font-bold">
                    U
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                    <input
                      ref={commentInputRef}
                      value={newCommentBody}
                      onChange={(e) => setNewCommentBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddComment()
                        }
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/25 outline-none"
                    />
                    <button
                      onClick={handleAddComment}
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <Paperclip size={14} />
                    </button>
                  </div>
                </div>

                {/* Comments list */}
                {comments.length > 0 && (
                  <div className="divide-y divide-[#1f1f1f]">
                    {comments.map((c) => (
                      <CommentRow key={c.id} comment={c} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
