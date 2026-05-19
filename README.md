# Daily Planner

A full-stack daily planner web app — calendar-integrated task manager with daily/weekly planning rituals, time tracking, and productivity analytics. Dark theme only.

## Stack

- **Frontend:** Next.js App Router · TypeScript · Tailwind CSS v4
- **State:** Zustand (client) · TanStack Query (server)
- **Database:** Prisma 7 · SQLite (dev) / PostgreSQL (prod)
- **Auth:** Better Auth
- **UI:** Tiptap (rich text) · @dnd-kit (drag & drop) · Recharts (charts) · Lucide React (icons)

## Getting started

```bash
bun install
bunx prisma migrate dev
bunx prisma db seed
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running with Conductor

Conductor automates Linear ticket implementation using Claude agents.

```bash
# Requires: LINEAR_API_KEY env var, GitHub CLI authenticated
cd /Users/aloe/Development/conductor
bun start /Users/aloe/Development/daily-planner/WORKFLOW.md
```

> **Note:** Linear workspace must have available issue slots.

## Development

```bash
bun run build       # type-check + build
bun run lint        # ESLint
bunx prisma studio  # DB browser UI
```
