import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRule, nextOccurrence, occurrencesBetween } from './recurrence'

function d(iso: string): Date {
  return new Date(iso + 'T00:00:00.000Z')
}

test('parseRule: daily', () => {
  assert.deepEqual(parseRule('daily'), { freq: 'daily', interval: 1 })
  assert.deepEqual(parseRule('daily:3'), { freq: 'daily', interval: 3 })
})

test('parseRule: weekly with day tokens', () => {
  assert.deepEqual(parseRule('weekly:MON,WED,FRI'), {
    freq: 'weekly', interval: 1, byday: [1, 3, 5],
  })
  assert.deepEqual(parseRule('weekly:MO,WE,FR:2'), {
    freq: 'weekly', interval: 2, byday: [1, 3, 5],
  })
})

test('parseRule: monthly', () => {
  assert.deepEqual(parseRule('monthly:15'), { freq: 'monthly', interval: 1, bymonthday: 15 })
  assert.deepEqual(parseRule('monthly:last'), { freq: 'monthly', interval: 1, bymonthday: -1 })
  assert.deepEqual(parseRule('monthly:1:3'), { freq: 'monthly', interval: 3, bymonthday: 1 })
})

test('parseRule: RRULE subset', () => {
  assert.deepEqual(parseRule('rrule:FREQ=DAILY;INTERVAL=2'), {
    freq: 'daily', interval: 2,
  })
  assert.deepEqual(parseRule('rrule:FREQ=WEEKLY;BYDAY=MO,WE,FR'), {
    freq: 'weekly', interval: 1, byday: [1, 3, 5],
  })
  assert.deepEqual(parseRule('rrule:FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=2'), {
    freq: 'monthly', interval: 2, bymonthday: 15,
  })
})

test('parseRule: rejects malformed input', () => {
  assert.throws(() => parseRule(''))
  assert.throws(() => parseRule('weekly'))
  assert.throws(() => parseRule('monthly'))
  assert.throws(() => parseRule('monthly:99'))
  assert.throws(() => parseRule('rrule:FREQ=YEARLY'))
})

test('nextOccurrence: daily advances one day', () => {
  const rule = parseRule('daily')
  const anchor = d('2026-05-15')
  const next = nextOccurrence(rule, anchor, d('2026-05-15'))
  assert.equal(next.toISOString(), '2026-05-16T00:00:00.000Z')
})

test('nextOccurrence: daily with interval 3 aligns to anchor', () => {
  const rule = parseRule('daily:3')
  const anchor = d('2026-05-15')
  // From 2026-05-15 → next is 2026-05-18 (anchor + 3d)
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-15')).toISOString(), '2026-05-18T00:00:00.000Z')
  // From 2026-05-16 → still 2026-05-18 (next aligned day after)
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-16')).toISOString(), '2026-05-18T00:00:00.000Z')
  // From 2026-05-18 → skip to 2026-05-21
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-18')).toISOString(), '2026-05-21T00:00:00.000Z')
})

test('nextOccurrence: weekly MON,WED,FRI', () => {
  const rule = parseRule('weekly:MON,WED,FRI')
  const anchor = d('2026-05-15') // Friday
  // From Fri → next is Mon 2026-05-18
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-15')).toISOString(), '2026-05-18T00:00:00.000Z')
  // From Mon → Wed
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-18')).toISOString(), '2026-05-20T00:00:00.000Z')
  // From Wed → Fri
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-20')).toISOString(), '2026-05-22T00:00:00.000Z')
})

test('nextOccurrence: every 2 weeks on MON', () => {
  const rule = parseRule('weekly:MON:2')
  const anchor = d('2026-05-18') // Monday week 0
  // Next: skip week 1, go to Mon week 2 → 2026-06-01
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-18')).toISOString(), '2026-06-01T00:00:00.000Z')
})

test('nextOccurrence: monthly:15', () => {
  const rule = parseRule('monthly:15')
  const anchor = d('2026-05-15')
  assert.equal(nextOccurrence(rule, anchor, d('2026-05-15')).toISOString(), '2026-06-15T00:00:00.000Z')
  assert.equal(nextOccurrence(rule, anchor, d('2026-06-15')).toISOString(), '2026-07-15T00:00:00.000Z')
})

test('nextOccurrence: monthly:31 clamps short months', () => {
  const rule = parseRule('monthly:31')
  const anchor = d('2026-01-31')
  // Feb has 28 days in 2026 → clamps to 2026-02-28
  assert.equal(nextOccurrence(rule, anchor, d('2026-01-31')).toISOString(), '2026-02-28T00:00:00.000Z')
})

test('nextOccurrence: monthly:last', () => {
  const rule = parseRule('monthly:last')
  const anchor = d('2026-01-31')
  assert.equal(nextOccurrence(rule, anchor, d('2026-01-31')).toISOString(), '2026-02-28T00:00:00.000Z')
  assert.equal(nextOccurrence(rule, anchor, d('2026-02-28')).toISOString(), '2026-03-31T00:00:00.000Z')
})

test('occurrencesBetween: daily over a week', () => {
  const occ = occurrencesBetween('daily', d('2026-05-15'), d('2026-05-15'), d('2026-05-21'))
  assert.deepEqual(occ.map(o => o.toISOString()), [
    '2026-05-16T00:00:00.000Z',
    '2026-05-17T00:00:00.000Z',
    '2026-05-18T00:00:00.000Z',
    '2026-05-19T00:00:00.000Z',
    '2026-05-20T00:00:00.000Z',
    '2026-05-21T00:00:00.000Z',
  ])
})

test('occurrencesBetween: weekly MON,WED over two weeks', () => {
  const occ = occurrencesBetween(
    'weekly:MON,WED',
    d('2026-05-18'), // Monday
    d('2026-05-18'),
    d('2026-05-31'),
  )
  assert.deepEqual(occ.map(o => o.toISOString()), [
    '2026-05-20T00:00:00.000Z',
    '2026-05-25T00:00:00.000Z',
    '2026-05-27T00:00:00.000Z',
  ])
})

test('occurrencesBetween: empty window yields no occurrences', () => {
  // Same start and end with anchor on that day → no occurrences strictly after start within (start, end].
  const occ = occurrencesBetween('daily', d('2026-05-15'), d('2026-05-15'), d('2026-05-15'))
  assert.deepEqual(occ, [])
})
