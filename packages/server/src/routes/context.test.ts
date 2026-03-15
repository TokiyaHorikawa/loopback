import * as schema from '@loopback/db'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@loopback/db', async () => {
  const actual = await vi.importActual<typeof import('@loopback/db')>('@loopback/db')
  return {
    ...actual,
    getDb: vi.fn(),
  }
})

import { app } from '../app.js'

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(`
    CREATE TABLE goals (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      start_date text NOT NULL,
      end_date text NOT NULL,
      created_at text DEFAULT (datetime('now')) NOT NULL
    );
    CREATE TABLE reviews (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      date text NOT NULL,
      created_at text DEFAULT (datetime('now')) NOT NULL
    );
    CREATE TABLE review_goals (
      review_id integer NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      goal_id integer NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      PRIMARY KEY (review_id, goal_id)
    );
  `)
  return drizzle(sqlite, { schema })
}

let testDb: ReturnType<typeof createTestDb>

beforeEach(() => {
  testDb = createTestDb()
  vi.mocked(schema.getDb).mockReturnValue(testDb as any)
})

function postGoal(overrides: Record<string, string> = {}) {
  return app.request('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'quarterly',
      content: 'Test goal',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      ...overrides,
    }),
  })
}

function postReview(body: unknown) {
  return app.request('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function getContext() {
  return app.request('/api/context')
}

describe('GET /api/context', () => {
  it('returns empty state when no data exists', async () => {
    const res = await getContext()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      goals: [],
      review_stats: { total: 0, last_reviewed_at: null },
      recent_reviews: [],
    })
  })

  it('returns only active goals (within date range)', async () => {
    // active goal (today falls within range)
    await postGoal({ start_date: '2026-01-01', end_date: '2026-12-31' })
    // expired goal
    await postGoal({ start_date: '2025-01-01', end_date: '2025-12-31' })
    // future goal
    await postGoal({ start_date: '2027-01-01', end_date: '2027-12-31' })

    const res = await getContext()
    const body = await res.json()
    expect(body.goals).toHaveLength(1)
    expect(body.goals[0].id).toBe(1)
  })

  it('returns correct review_stats', async () => {
    await postReview({ type: 'interim', content: 'r1', date: '2026-02-01' })
    await postReview({ type: 'interim', content: 'r2', date: '2026-03-01' })

    const res = await getContext()
    const body = await res.json()
    expect(body.review_stats.total).toBe(2)
    expect(body.review_stats.last_reviewed_at).toBe('2026-03-01')
  })

  it('returns recent_reviews ordered by id desc with goal_ids', async () => {
    await postGoal()
    await postReview({ type: 'interim', content: 'r1', date: '2026-01-15', goal_ids: [1] })
    await postReview({ type: 'interim', content: 'r2', date: '2026-02-15' })

    const res = await getContext()
    const body = await res.json()
    expect(body.recent_reviews).toHaveLength(2)
    expect(body.recent_reviews[0].content).toBe('r2')
    expect(body.recent_reviews[0].goal_ids).toEqual([])
    expect(body.recent_reviews[1].content).toBe('r1')
    expect(body.recent_reviews[1].goal_ids).toEqual([1])
  })

  it('limits recent_reviews to 5', async () => {
    for (let i = 1; i <= 6; i++) {
      await postReview({
        type: 'interim',
        content: `r${i}`,
        date: `2026-01-${String(i).padStart(2, '0')}`,
      })
    }

    const res = await getContext()
    const body = await res.json()
    expect(body.recent_reviews).toHaveLength(5)
    expect(body.recent_reviews[0].content).toBe('r6')
    expect(body.recent_reviews[4].content).toBe('r2')
  })
})
