---
name: add-new-app-page
description: Workflow command scaffold for add-new-app-page in daily-planner.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-app-page

Use this workflow when working on **add-new-app-page** in `daily-planner`.

## Goal

Implements a new page in the application, often with a corresponding route and UI component.

## Common Files

- `src/app/(app)/*/page.tsx`
- `src/components/*/*.tsx`
- `src/app/api/*/route.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create new page file in src/app/(app)/[page]/page.tsx
- Implement UI and logic for the page
- Optionally create or update supporting components in src/components/[feature]/
- Optionally add new API routes to support the page

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.