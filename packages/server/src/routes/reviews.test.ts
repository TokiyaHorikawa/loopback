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

function postReview(body: unknown) {
  return app.request('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postGoal() {
  return app.request('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'quarterly',
      content: 'Test goal',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
    }),
  })
}

describe('POST /api/reviews', () => {
  it('creates an interim review without goal_ids', async () => {
    const res = await postReview({
      type: 'interim',
      content: '順調に進んでいる',
      date: '2026-02-15',
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.type).toBe('interim')
    expect(body.content).toBe('順調に進んでいる')
    expect(body.date).toBe('2026-02-15')
    expect(body.goal_ids).toEqual([])
    expect(body.created_at).toBeDefined()
  })

  it('creates an interim review with goal_ids', async () => {
    await postGoal()
    const res = await postReview({
      type: 'interim',
      content: '中間レビュー',
      date: '2026-02-15',
      goal_ids: [1],
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.goal_ids).toEqual([1])
  })

  it('creates a final review with exactly 1 goal_id', async () => {
    await postGoal()
    const res = await postReview({
      type: 'final',
      content: '最終レビュー',
      date: '2026-03-31',
      goal_ids: [1],
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.type).toBe('final')
    expect(body.goal_ids).toEqual([1])
  })

  it('returns 400 for final review without goal_ids', async () => {
    const res = await postReview({
      type: 'final',
      content: '最終レビュー',
      date: '2026-03-31',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for final review with 2+ goal_ids', async () => {
    await postGoal()
    await postGoal()
    const res = await postReview({
      type: 'final',
      content: '最終レビュー',
      date: '2026-03-31',
      goal_ids: [1, 2],
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await postReview({ type: 'interim' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await app.request('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON')
  })

  it('returns 400 for invalid type', async () => {
    const res = await postReview({
      type: 'monthly',
      content: 'test',
      date: '2026-02-15',
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/reviews', () => {
  it('returns empty array when no reviews exist', async () => {
    const res = await app.request('/api/reviews')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns reviews ordered by id desc', async () => {
    await postReview({
      type: 'interim',
      content: 'First review',
      date: '2026-02-01',
    })
    await postReview({
      type: 'interim',
      content: 'Second review',
      date: '2026-02-15',
    })

    const res = await app.request('/api/reviews')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].content).toBe('Second review')
    expect(body[1].content).toBe('First review')
  })

  it('includes goal_ids in response', async () => {
    await postGoal()
    await postReview({
      type: 'interim',
      content: 'Review with goals',
      date: '2026-02-15',
      goal_ids: [1],
    })

    const res = await app.request('/api/reviews')
    const body = await res.json()
    expect(body[0].goal_ids).toEqual([1])
  })
})

describe('GET /api/reviews/:id', () => {
  it('returns a review with goal_ids', async () => {
    await postGoal()
    await postReview({
      type: 'final',
      content: '最終レビュー',
      date: '2026-03-31',
      goal_ids: [1],
    })

    const res = await app.request('/api/reviews/1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.content).toBe('最終レビュー')
    expect(body.goal_ids).toEqual([1])
  })

  it('returns 404 for non-existent review', async () => {
    const res = await app.request('/api/reviews/999')
    expect(res.status).toBe(404)
  })
})
