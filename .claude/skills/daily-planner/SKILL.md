```markdown
# daily-planner Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you how to contribute to the `daily-planner` codebase, a Next.js application written in TypeScript. You'll learn the project's coding conventions, how to add features or pages, update the database schema, and work with both frontend and backend code. The guide covers common workflows, code style, and testing patterns to help you make effective, consistent contributions.

## Coding Conventions

**File Naming**
- Use `camelCase` for filenames.
  - Example: `taskList.tsx`, `userStore.ts`

**Import Style**
- Use alias imports for modules.
  - Example:
    ```typescript
    import TaskList from '@/components/tasks/taskList'
    import { getUser } from '@/lib/user'
    ```

**Export Style**
- Use default exports for components and modules.
  - Example:
    ```typescript
    export default function TaskList() { ... }
    ```

**Commit Messages**
- Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes: `feat`, `fix`, `chore`.
  - Example: `feat: add focus mode page for daily planning`

## Workflows

### Add New API Endpoint
**Trigger:** When you need to expose new backend functionality or data to the frontend.  
**Command:** `/new-api-endpoint`

1. Create or update a route handler file in `src/app/api/[resource]/route.ts` or `src/app/api/[resource]/[id]/route.ts`.
2. Implement business logic and database access in the route handler.
    ```typescript
    // src/app/api/tasks/route.ts
    import { NextRequest, NextResponse } from 'next/server'
    import { getTasks } from '@/lib/tasks'

    export default async function handler(req: NextRequest) {
      const tasks = await getTasks()
      return NextResponse.json(tasks)
    }
    ```
3. Optionally, update related frontend files to consume the new API endpoint.

---

### Add New App Page
**Trigger:** When you want to add a new user-facing page (e.g., focus, backlog, analytics, shutdown, highlights).  
**Command:** `/new-app-page`

1. Create a new page file in `src/app/(app)/[page]/page.tsx`.
    ```typescript
    // src/app/(app)/focus/page.tsx
    export default function FocusPage() {
      return <div>Focus Mode</div>
    }
    ```
2. Implement the UI and logic for the page.
3. Optionally, create or update supporting components in `src/components/[feature]/`.
4. Optionally, add new API routes to support the page.

---

### Feature Development with API and Store
**Trigger:** When adding a complex feature that needs both backend API endpoints and frontend state management.  
**Command:** `/new-feature`

1. Add or update API route(s) in `src/app/api/[feature]/route.ts` or `src/app/api/[feature]/[id]/route.ts`.
2. Add or update a frontend store in `src/store/[feature].ts`.
    ```typescript
    // src/store/taskStore.ts
    import { create } from 'zustand'

    export const useTaskStore = create((set) => ({
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
    }))
    ```
3. Create or update UI components in `src/components/[feature]/*.tsx`.
4. Integrate API calls and state management in components.

---

### Prisma Schema Change and Migration
**Trigger:** When you need to add or modify database tables/models.  
**Command:** `/new-table`

1. Edit `prisma/schema.prisma` to define new or updated models.
    ```prisma
    model Task {
      id        String   @id @default(uuid())
      title     String
      completed Boolean  @default(false)
    }
    ```
2. Generate and apply a new migration:
    ```sh
    npx prisma migrate dev --name add-task-model
    ```
3. Update or add seed data in `prisma/seed.ts`.
4. Update backend logic or API routes to use the new/changed models.

---

### UI Layout or Shell Update
**Trigger:** When you want to add or change the app shell, navigation, or persistent UI elements.  
**Command:** `/update-layout`

1. Edit `src/app/(app)/layout.tsx` or `src/app/layout.tsx`.
2. Create or update layout components in `src/components/layout/*.tsx`.
    ```typescript
    // src/components/layout/Sidebar.tsx
    export default function Sidebar() {
      return <nav>...</nav>
    }
    ```
3. Wire layout components into the main layout file.

---

## Testing Patterns

- Test files follow the pattern `*.test.*` (e.g., `taskStore.test.ts`).
- The specific testing framework is not specified, but typical patterns suggest using Jest or similar.
- Place tests alongside the modules they test or in a dedicated `__tests__` directory.

  ```typescript
  // src/store/taskStore.test.ts
  import { useTaskStore } from './taskStore'

  test('sets tasks', () => {
    useTaskStore.getState().setTasks([{ title: 'Test', completed: false }])
    expect(useTaskStore.getState().tasks).toHaveLength(1)
  })
  ```

## Commands

| Command            | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| /new-api-endpoint  | Add a new backend API route                                    |
| /new-app-page      | Create a new user-facing page                                  |
| /new-feature       | Develop a feature with both API and frontend state management  |
| /new-table         | Update Prisma schema and run a migration                       |
| /update-layout     | Update or create persistent UI layout components               |
```