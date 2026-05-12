import type { Task } from '@/types/index'

// Shape returned by the API (Prisma Task with relations)
export interface ApiTask {
  id: string
  title: string
  description: string
  notes: string
  channelId: string | null
  channel: { id: string; name: string; color: string; contextId: string | null } | null
  startDate: string | null
  dueDate: string | null
  scheduledTime: string | null
  plannedTime: number
  actualTime: number
  completed: boolean
  completedAt: string | null
  priority: string
  backlogStatus: string | null
  sortOrder: number
  archived: boolean
  recurring: string | null
  userId: string
  subtasks: Array<{
    id: string
    title: string
    plannedTime: number
    actualTime: number
    completed: boolean
    sortOrder: number
    taskId: string
  }>
  comments: Array<{
    id: string
    body: string
    taskId: string
    userId: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

export function mapApiTaskToTask(api: ApiTask): Task {
  return {
    id: api.id,
    title: api.title,
    description: api.description || undefined,
    status: api.completed ? 'done' : api.backlogStatus === 'backlog' ? 'backlog' : 'todo',
    priority: (api.priority === 'urgent' || api.priority === 'high' || api.priority === 'medium' || api.priority === 'low')
      ? (api.priority as Task['priority'])
      : 'medium',
    channelId: api.channelId ?? undefined,
    channel: api.channel
      ? {
          id: api.channel.id,
          name: api.channel.name,
          color: api.channel.color,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : undefined,
    subtasks: api.subtasks.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      title: s.title,
      completed: s.completed,
      order: s.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    comments: api.comments.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      userId: c.userId,
      content: c.body,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.createdAt),
    })),
    dueDate: api.dueDate ? new Date(api.dueDate) : undefined,
    scheduledDate: api.startDate ? new Date(api.startDate) : undefined,
    scheduledStart: api.scheduledTime ?? undefined,
    estimatedMinutes: api.plannedTime || undefined,
    actualMinutes: api.actualTime || undefined,
    order: api.sortOrder,
    tags: [],
    isRecurring: !!api.recurring,
    recurringPattern: api.recurring ?? undefined,
    userId: api.userId,
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  }
}
