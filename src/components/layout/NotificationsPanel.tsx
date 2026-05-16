'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { CalendarClock, Moon, Target, AlertTriangle, X, Check, CheckCheck, Trash2 } from 'lucide-react'
import {
  useClearAllNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationItem,
  type NotificationKind,
} from '@/hooks/useNotifications'

const KIND_ICON: Record<NotificationKind, React.ElementType> = {
  daily_planning_due: CalendarClock,
  shutdown_due: Moon,
  weekly_planning_due: Target,
  task_overdue: AlertTriangle,
}

function NotificationRow({
  item,
  onClose,
}: {
  item: NotificationItem
  onClose: () => void
}) {
  const markRead = useMarkNotificationRead()
  const Icon = KIND_ICON[item.kind] ?? AlertTriangle
  const unread = !item.readAt

  const handleClick = () => {
    if (unread) markRead.mutate(item.id)
    onClose()
  }

  const inner = (
    <div
      className={`
        flex items-start gap-2 p-2 rounded-md group cursor-pointer
        hover:bg-[#1a1a1a] transition-colors
        ${unread ? 'bg-[#161616]' : ''}
      `}
      onClick={handleClick}
    >
      <Icon size={14} strokeWidth={1.75} className="mt-0.5 text-[--color-accent] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-white/90 truncate">{item.payload.title}</p>
          {unread && (
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-accent] flex-shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{item.payload.message}</p>
        <p className="text-[10px] text-white/30 mt-1">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>
      </div>
      {unread && (
        <button
          aria-label="Mark as read"
          onClick={(e) => {
            e.stopPropagation()
            markRead.mutate(item.id)
          }}
          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1"
        >
          <Check size={12} />
        </button>
      )}
    </div>
  )

  if (item.payload.href) {
    return (
      <Link href={item.payload.href} className="block" onClick={handleClick}>
        {inner}
      </Link>
    )
  }
  return inner
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading, error } = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const clearAll = useClearAllNotifications()

  const items = data ?? []
  const unreadCount = items.filter((n) => !n.readAt).length

  return (
    <aside className="w-[320px] h-screen bg-[#141414] border-l border-[--color-border] flex-shrink-0 flex flex-col">
      <header className="flex items-center justify-between px-3 py-2 border-b border-[--color-border]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-white/90">Notifications</h2>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[--color-accent]/20 text-[--color-accent]">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close notifications"
          className="text-white/40 hover:text-white p-1"
        >
          <X size={14} />
        </button>
      </header>

      <div className="flex items-center gap-1 px-2 py-1 border-b border-[--color-border]">
        <button
          onClick={() => markAll.mutate()}
          disabled={unreadCount === 0 || markAll.isPending}
          className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white px-2 py-1 rounded hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <CheckCheck size={12} />
          Mark all read
        </button>
        <button
          onClick={() => clearAll.mutate()}
          disabled={items.length === 0 || clearAll.isPending}
          className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white px-2 py-1 rounded hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} />
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-auto p-1">
        {isLoading && (
          <p className="text-xs text-white/40 text-center mt-6">Loading…</p>
        )}
        {error && (
          <p className="text-xs text-red-400 text-center mt-6">
            Failed to load notifications
          </p>
        )}
        {!isLoading && !error && items.length === 0 && (
          <p className="text-xs text-white/40 text-center mt-6">No notifications</p>
        )}
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onClose={onClose} />
          ))}
        </div>
      </div>
    </aside>
  )
}
