'use client'

import { useEffect } from 'react'

export function KeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // 'a' → add task (emit custom event)
      if (e.key === 'a' && !isInInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        document.dispatchEvent(new CustomEvent('add-task'))
        return
      }

      // Cmd+K → open search (set search active in right strip)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('open-search'))
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}
