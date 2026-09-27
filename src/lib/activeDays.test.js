import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeActiveDays } from './activeDays.js'

test('normalizeActiveDays handles nested JSON-string arrays and duplicates', () => {
  const result = normalizeActiveDays([
    '["mon","tue","wed","thu","fri","sat","sun"]',
    'mon',
    'tue',
    'thu',
    'fri',
    'sat',
    'sun',
  ])

  assert.deepEqual(result, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
})

test('normalizeActiveDays supports comma-delimited strings and keeps a fallback default', () => {
  assert.deepEqual(normalizeActiveDays('mon, wed, fri'), ['mon', 'wed', 'fri'])
  assert.deepEqual(normalizeActiveDays(null), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
})
