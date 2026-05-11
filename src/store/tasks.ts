import { create } from 'zustand'
import type { Task } from '@/types/index'

let _timerInterval: ReturnType<typeof setInterval> | null = null

interface TasksState {
  tasks: Task[]
  selectedTaskId: string | null
  activeTimer: string | null
  timerSeconds: number
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  selectTask: (id: string | null) => void
  startTimer: (taskId: string) => void
  stopTimer: () => void
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  activeTimer: null,
  timerSeconds: 0,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    })),

  selectTask: (id) => set({ selectedTaskId: id }),

  startTimer: (taskId: string) => {
    const { activeTimer } = get()
    // Clear any existing timer
    if (_timerInterval) {
      clearInterval(_timerInterval)
      _timerInterval = null
    }
    // Get the current actualMinutes for the task as the starting base in seconds
    const task = get().tasks.find((t) => t.id === taskId)
    const baseSeconds = (task?.actualMinutes ?? 0) * 60
    set({ activeTimer: taskId, timerSeconds: baseSeconds })
    _timerInterval = setInterval(() => {
      set((state) => ({ timerSeconds: state.timerSeconds + 1 }))
    }, 1000)
    // Stop previous timer if switching tasks
    if (activeTimer && activeTimer !== taskId) {
      // Nothing extra needed — we already cleared the interval above
    }
  },

  stopTimer: () => {
    if (_timerInterval) {
      clearInterval(_timerInterval)
      _timerInterval = null
    }
    set({ activeTimer: null })
  },
}))
