export type ShortcutGroup = 'General' | 'Navigation' | 'Tasks'

export interface Shortcut {
  id: string
  keys: string[]
  label: string
  group: ShortcutGroup
  match: (e: KeyboardEvent) => boolean
  run: (ctx: ShortcutContext) => void
}

export interface ShortcutContext {
  navigate: (href: string) => void
  openOverlay: () => void
  closeOverlay: () => void
  isOverlayOpen: () => boolean
}

const isMod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey

export const shortcuts: Shortcut[] = [
  {
    id: 'show-shortcuts',
    keys: ['?'],
    label: 'Show keyboard shortcuts',
    group: 'General',
    match: (e) => e.key === '?' && !isMod(e) && !e.altKey,
    run: (ctx) => ctx.openOverlay(),
  },
  {
    id: 'close-overlay',
    keys: ['Esc'],
    label: 'Close overlay / dialog',
    group: 'General',
    match: (e) => e.key === 'Escape',
    run: (ctx) => ctx.closeOverlay(),
  },
  {
    id: 'open-search',
    keys: ['⌘', 'K'],
    label: 'Open search',
    group: 'General',
    match: (e) => isMod(e) && e.key.toLowerCase() === 'k',
    run: () => document.dispatchEvent(new CustomEvent('open-search')),
  },
  {
    id: 'add-task',
    keys: ['A'],
    label: 'Add task',
    group: 'Tasks',
    match: (e) => e.key === 'a' && !isMod(e) && !e.altKey && !e.shiftKey,
    run: () => document.dispatchEvent(new CustomEvent('add-task')),
  },
  {
    id: 'nav-home',
    keys: ['G', 'H'],
    label: 'Go to Home (Board)',
    group: 'Navigation',
    match: () => false, // handled by chord state
    run: (ctx) => ctx.navigate('/board'),
  },
  {
    id: 'nav-today',
    keys: ['G', 'T'],
    label: 'Go to Today',
    group: 'Navigation',
    match: () => false,
    run: (ctx) => ctx.navigate('/today'),
  },
  {
    id: 'nav-focus',
    keys: ['G', 'F'],
    label: 'Go to Focus',
    group: 'Navigation',
    match: () => false,
    run: (ctx) => ctx.navigate('/focus'),
  },
  {
    id: 'nav-plan',
    keys: ['G', 'P'],
    label: 'Go to Plan',
    group: 'Navigation',
    match: () => false,
    run: (ctx) => ctx.navigate('/plan'),
  },
  {
    id: 'nav-shutdown',
    keys: ['G', 'S'],
    label: 'Go to Shutdown',
    group: 'Navigation',
    match: () => false,
    run: (ctx) => ctx.navigate('/shutdown'),
  },
  {
    id: 'nav-highlights',
    keys: ['G', 'L'],
    label: 'Go to Highlights',
    group: 'Navigation',
    match: () => false,
    run: (ctx) => ctx.navigate('/highlights'),
  },
  {
    id: 'nav-backlog',
    keys: ['G', 'B'],
    label: 'Go to Backlog',
    group: 'Navigation',
    match: () => false,
    run: (ctx) => ctx.navigate('/backlog'),
  },
]

// Chord prefix: 'g' followed by a letter routes to navigation entries.
export const navChordMap: Record<string, string> = {
  h: '/board',
  t: '/today',
  f: '/focus',
  p: '/plan',
  s: '/shutdown',
  l: '/highlights',
  b: '/backlog',
}
