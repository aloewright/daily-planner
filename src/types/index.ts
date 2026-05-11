export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Channel {
  id: string
  name: string
  color: string
  icon?: string
  description?: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface Context {
  id: string
  name: string
  color: string
  icon?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  channelId?: string
  contextId?: string
  channel?: Channel
  context?: Context
  subtasks?: Subtask[]
  comments?: Comment[]
  dueDate?: Date
  scheduledDate?: Date
  scheduledStart?: string
  scheduledEnd?: string
  estimatedMinutes?: number
  actualMinutes?: number
  order: number
  tags: string[]
  isRecurring: boolean
  recurringPattern?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface WeeklyObjective {
  id: string
  userId: string
  weekStart: Date
  title: string
  description?: string
  completed: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface DailyPlan {
  id: string
  userId: string
  date: Date
  intentions?: string
  morningNotes?: string
  eveningNotes?: string
  energyLevel?: number
  mood?: number
  completionRate?: number
  taskIds: string[]
  createdAt: Date
  updatedAt: Date
}

export interface UserSettings {
  id: string
  userId: string
  workStartTime: string
  workEndTime: string
  defaultTaskDuration: number
  weekStartDay: number
  theme: string
  notificationsEnabled: boolean
  focusModeDefault: number
  timezone: string
  createdAt: Date
  updatedAt: Date
}
