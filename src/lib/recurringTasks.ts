import type { PrismaClient } from '@prisma/client'
import { occurrencesBetween, parseRule } from './recurrence'

export interface GenerateResult {
  scannedSeries: number
  created: number
  skipped: number
  errors: Array<{ taskId: string; error: string }>
}

interface GenerateOptions {
  /** Inclusive upper bound for occurrence dates to materialize. */
  through: Date
  /** Optional limit on how many series to scan in one run. */
  limit?: number
}

/**
 * Idempotently materialize the next batch of occurrences for every recurring
 * series owned by every user.
 *
 * A "series parent" is any non-archived task with a non-empty `recurring` rule
 * and no `recurringParentId`. Instances are children that point back to the
 * parent.
 *
 * The unique index (recurringParentId, startDate) provides the hard idempotency
 * guarantee: even if two cron runs race, only one row per (series, date) can
 * survive. We additionally short-circuit with a findFirst lookup to keep the
 * happy path cheap.
 */
export async function generateRecurringInstances(
  db: PrismaClient,
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const result: GenerateResult = { scannedSeries: 0, created: 0, skipped: 0, errors: [] }

  const parents = await db.task.findMany({
    where: {
      archived: false,
      recurring: { not: null },
      recurringParentId: null,
    },
    take: opts.limit ?? 1000,
  })

  for (const parent of parents) {
    result.scannedSeries++

    try {
      if (!parent.recurring) continue
      const rule = parseRule(parent.recurring)

      // Anchor: prefer explicit startDate; fall back to creation time.
      const anchor = parent.startDate ?? parent.createdAt
      const lastGenerated = parent.recurringLastGeneratedFor ?? anchor

      // Cap the window at recurringEndDate when set.
      const through = parent.recurringEndDate && parent.recurringEndDate.getTime() < opts.through.getTime()
        ? parent.recurringEndDate
        : opts.through

      if (through.getTime() <= lastGenerated.getTime()) {
        result.skipped++
        continue
      }

      const dates = occurrencesBetween(rule, anchor, lastGenerated, through)

      let latest = lastGenerated
      for (const date of dates) {
        // Cheap pre-check; the unique index is still the source of truth.
        const existing = await db.task.findFirst({
          where: { recurringParentId: parent.id, startDate: date },
          select: { id: true },
        })
        if (existing) {
          result.skipped++
          if (date.getTime() > latest.getTime()) latest = date
          continue
        }

        try {
          await db.task.create({
            data: {
              title: parent.title,
              description: parent.description,
              notes: parent.notes,
              channelId: parent.channelId,
              startDate: date,
              dueDate: parent.dueDate,
              scheduledTime: parent.scheduledTime,
              plannedTime: parent.plannedTime,
              priority: parent.priority,
              sortOrder: parent.sortOrder,
              userId: parent.userId,
              recurringParentId: parent.id,
            },
          })
          result.created++
          if (date.getTime() > latest.getTime()) latest = date
        } catch (err) {
          const prismaErr = err as { code?: string }
          if (prismaErr?.code === 'P2002') {
            // Unique-constraint race: another worker created the same instance.
            result.skipped++
            if (date.getTime() > latest.getTime()) latest = date
          } else {
            throw err
          }
        }
      }

      if (latest.getTime() > lastGenerated.getTime()) {
        await db.task.update({
          where: { id: parent.id },
          data: { recurringLastGeneratedFor: latest },
        })
      }
    } catch (err) {
      result.errors.push({
        taskId: parent.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return result
}
