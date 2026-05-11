import { create } from 'zustand'
import type { Task } from '@/types/index'

interface TasksState {
  tasks: Task[]
  selectedTaskId: string | null
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  selectTask: (id: string | null) => void
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [],
  selectedTaskId: null,

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
}))
