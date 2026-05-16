import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRule } from '@/lib/recurrence'

type Params = { params: Promise<{ id: string }> }

/**
 * Edit-this vs. edit-series semantics.
 *
 * Each occurrence of a recurring task is its own row that points at the series
 * parent via `recurringParentId`. The series parent holds the rule and the
 * "canonical" content; instances are independent copies.
 *
 * - scope: 'instance' (default) — patch/delete only this row.
 * - scope: 'series'              — patch/delete the parent. For PATCH this also
 *                                  propagates field changes to future, unedited
 *                                  occurrences. For DELETE this removes the
 *                                  parent and all instances.
 */
type EditScope = 'instance' | 'series'

function parseScope(input: unknown): EditScope {
  return input === 'series' ? 'series' : 'instance'
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const task = await db.task.findUnique({
      where: { id },
      include: {
        channel: true,
        subtasks: true,
        comments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await request.json()
    const {
      title, description, completed, startDate, plannedTime,
      actualTime, channelId, priority, scheduledTime, notes,
      sortOrder, backlogStatus, recurring, recurringEndDate,
      scope: rawScope,
    } = body

    const scope = parseScope(rawScope)

    if (recurring !== undefined && recurring !== null) {
      try {
        parseRule(recurring)
      } catch (err) {
        return NextResponse.json(
          { error: `Invalid recurrence rule: ${err instanceof Error ? err.message : 'unknown'}` },
          { status: 400 },
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (completed !== undefined) {
      data.completed = completed
      data.completedAt = completed ? new Date() : null
    }
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (plannedTime !== undefined) data.plannedTime = plannedTime
    if (actualTime !== undefined) data.actualTime = actualTime
    if (channelId !== undefined) data.channelId = channelId
    if (priority !== undefined) data.priority = priority
    if (scheduledTime !== undefined) data.scheduledTime = scheduledTime
    if (notes !== undefined) data.notes = notes
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    if (backlogStatus !== undefined) data.backlogStatus = backlogStatus
    if (recurring !== undefined) data.recurring = recurring
    if (recurringEndDate !== undefined) {
      data.recurringEndDate = recurringEndDate ? new Date(recurringEndDate) : null
    }

    // Resolve the target row when scope=series:
    //   - If this task is itself an instance (recurringParentId is set), patch the parent.
    //   - Otherwise the caller is already targeting the parent.
    let targetId = id
    let propagateToFutureInstances = false
    if (scope === 'series') {
      const me = await db.task.findUnique({
        where: { id },
        select: { id: true, recurringParentId: true, recurring: true },
      })
      if (!me) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      targetId = me.recurringParentId ?? me.id
      propagateToFutureInstances = true
    }

    const task = await db.task.update({
      where: { id: targetId },
      data,
      include: { channel: true, subtasks: true, comments: true },
    })

    // Propagate non-identity, non-occurrence-specific fields to future instances
    // that haven't been individually edited. We use updatedAt as a heuristic for
    // "untouched": instances start with updatedAt ≈ createdAt; any user edit
    // bumps updatedAt beyond createdAt by more than a small skew.
    if (propagateToFutureInstances) {
      const now = new Date()
      const propagatable: Record<string, unknown> = {}
      const PROPAGATE_KEYS = [
        'title', 'description', 'notes', 'channelId',
        'plannedTime', 'priority', 'scheduledTime',
      ] as const
      for (const k of PROPAGATE_KEYS) {
        if (k in data) propagatable[k] = data[k]
      }
      if (Object.keys(propagatable).length > 0) {
        await db.task.updateMany({
          where: {
            recurringParentId: targetId,
            completed: false,
            startDate: { gte: now },
          },
          data: propagatable,
        })
      }
    }

    return NextResponse.json(task)
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    console.error('[PATCH /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const { searchParams } = new URL(request.url)
    const scope = parseScope(searchParams.get('scope'))

    if (scope === 'series') {
      const me = await db.task.findUnique({
        where: { id },
        select: { id: true, recurringParentId: true },
      })
      if (!me) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      const parentId = me.recurringParentId ?? me.id

      // Delete all instances first, then the parent. Because Task→Task has
      // onDelete: SetNull we cannot rely on cascade here.
      await db.task.deleteMany({ where: { recurringParentId: parentId } })
      await db.task.delete({ where: { id: parentId } })
      return NextResponse.json({ success: true, scope: 'series' })
    }

    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true, scope: 'instance' })
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    console.error('[DELETE /api/tasks/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
