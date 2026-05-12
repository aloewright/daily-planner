---
name: add-new-api-endpoint
description: Workflow command scaffold for add-new-api-endpoint in daily-planner.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-api-endpoint

Use this workflow when working on **add-new-api-endpoint** in `daily-planner`.

## Goal

Adds a new API route to support new features or data access, often with CRUD operations.

## Common Files

- `src/app/api/*/route.ts`
- `src/app/api/*/[id]/route.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update route handler file(s) in src/app/api/[resource]/[id]/route.ts or src/app/api/[resource]/route.ts
- Implement business logic and database access in the route handler(s)
- Optionally update related frontend files to consume the new API endpoint

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.