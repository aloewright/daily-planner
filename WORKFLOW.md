---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: daily-planner-6bde3e36d558
  active_states: ["Todo", "In Progress"]
  terminal_states: ["Done", "Cancelled", "Canceled", "Duplicate", "Closed"]

polling:
  interval_ms: 30000

workspace:
  root: ~/code/daily-planner-workspaces

agent:
  max_concurrent_agents: 3
  max_turns: 25
---

You are working on the **Daily Planner** app — a Sunsama-inspired full-stack daily planner.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v4 (dark only) · Prisma 7 · Zustand · TanStack Query · @dnd-kit · Tiptap · Recharts · Lucide React · date-fns

**Repo root:** `/Users/aloe/Development/daily-planner`

## Current ticket

**{{ issue.identifier }}: {{ issue.title }}**
URL: {{ issue.url }}

{{ issue.description }}

## Your job

1. Read the ticket and understand what to implement.
2. Explore `/Users/aloe/Development/daily-planner` to understand existing patterns.
3. Implement the feature following these conventions:
   - Dark theme only: `bg-[#0f0f0f]` root, `bg-[#141414]` sidebar, `bg-[#1a1a1a]` cards
   - Green accent `#4ade80`, amber channel badges `#f59e0b`, red dots `#ef4444`
   - Icons: `lucide-react` only
   - Prisma client from `src/lib/db.ts`
   - API routes in `src/app/api/`
   - Client state: Zustand stores in `src/store/`
   - Server state: TanStack Query hooks in `src/hooks/`
   - LLM/AI calls: Cloudflare AI Gateway `dynamic/text_gen` — never direct provider URLs
4. Run `bun run build` and fix all TypeScript errors before committing.
5. Commit with conventional commit: `feat({{ issue.identifier | downcase }}): {{ issue.title }}`
6. Push branch and open a GitHub PR referencing `{{ issue.identifier }}`.
7. Print a one-paragraph summary of what shipped.

## Constraints
- Never ask for human input — make decisions and proceed.
- Never commit `.env` files or secrets.
- If genuinely blocked, print `BLOCKED: <reason>` as the final message.
