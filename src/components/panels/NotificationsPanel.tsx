'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { QuickPanel } from './QuickPanel'

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

interface RecentTask {
  id: string
  title: string
  completedAt: string | null
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const [recent, setRecent] = useState<RecentTask[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRecent = useCallback(async () => {
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const sevenDaysAgo = format(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        'yyyy-MM-dd',
      )
      const res = await fetch(
        `/api/tasks?completed=true&startDate=${sevenDaysAgo}&endDate=${today}`,
      )
      if (res.ok) {
        const data: RecentTask[] = await res.json()
        setRecent(
          data
            .filter((t) => t.completedAt)
            .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
            .slice(0, 30),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchRecent()
  }, [open, fetchRecent])

  return (
    <QuickPanel open={open} title="Notifications" onClose={onClose}>
      <div className="p-3">
        {loading && (
          <p className="text-xs text-white/30 text-center py-6">Loading…</p>
        )}
        {!loading && recent.length === 0 && (
          <div className="flex flex-col items-center py-10 text-white/30">
            <Bell size={20} className="mb-2" />
            <p className="text-xs">No recent activity</p>
          </div>
        )}
        <ul className="space-y-1">
          {recent.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-2 px-2 py-1.5 rounded text-sm"
            >
              <CheckCircle2
                size={14}
                className="text-[#4ade80] flex-shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="text-white truncate">{t.title}</div>
                {t.completedAt && (
                  <div className="text-[11px] text-white/40 mt-0.5">
                    Completed {format(new Date(t.completedAt), 'MMM d, h:mm a')}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </QuickPanel>
  )
}
