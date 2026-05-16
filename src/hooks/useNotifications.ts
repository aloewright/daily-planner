import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type NotificationKind =
  | 'daily_planning_due'
  | 'shutdown_due'
  | 'weekly_planning_due'
  | 'task_overdue'

export interface NotificationPayload {
  title: string
  message: string
  href?: string
  taskId?: string
}

export interface NotificationItem {
  id: string
  kind: NotificationKind
  payload: NotificationPayload
  readAt: string | null
  createdAt: string
}

const QUERY_KEY = ['notifications'] as const

async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch('/api/notifications')
  if (!res.ok) throw new Error('Failed to fetch notifications')
  return res.json()
}

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchNotifications,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  })
}

export function useUnreadCount() {
  const { data } = useNotifications()
  return data?.filter((n) => !n.readAt).length ?? 0
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      if (!res.ok) throw new Error('Failed to mark notification read')
      return res.json() as Promise<NotificationItem>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to mark all read')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useClearAllNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear notifications')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
