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

function postGoal(body?: Partial<Record<string, unknown>>) {
  return app.request('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'quarterly',
      content: 'TypeScriptの理解を深める',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      ...body,
    }),
  })
}

let testDb: ReturnType<typeof createTestDb>

beforeEach(() => {
  testDb = createTestDb()
  vi.mocked(schema.getDb).mockReturnValue(testDb as any)
})

describe('POST /api/goals', () => {
  it('creates a new goal', async () => {
    const res = await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quarterly',
        content: 'TypeScriptの理解を深める',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.type).toBe('quarterly')
    expect(body.content).toBe('TypeScriptの理解を深める')
    expect(body.start_date).toBe('2026-01-01')
    expect(body.end_date).toBe('2026-03-31')
    expect(body.created_at).toBeDefined()
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'annual' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON')
  })

  it('returns 400 for invalid type', async () => {
    const res = await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'monthly',
        content: 'test',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/goals', () => {
  it('returns empty array when no goals exist', async () => {
    const res = await app.request('/api/goals')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns goals ordered by id desc', async () => {
    await postGoal({
      type: 'annual',
      content: 'First goal',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    })
    await postGoal({ content: 'Second goal', start_date: '2026-04-01', end_date: '2026-06-30' })

    const res = await app.request('/api/goals')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].content).toBe('Second goal')
    expect(body[1].content).toBe('First goal')
  })
})

describe('GET /api/goals/:id', () => {
  it('returns a goal by id', async () => {
    await postGoal()
    const res = await app.request('/api/goals/1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.content).toBe('TypeScriptの理解を深める')
  })

  it('returns 404 for non-existent goal', async () => {
    const res = await app.request('/api/goals/999')
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/goals/:id', () => {
  it('updates a goal', async () => {
    await postGoal()
    const res = await app.request('/api/goals/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'annual',
        content: '更新後の目標',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.type).toBe('annual')
    expect(body.content).toBe('更新後の目標')
  })

  it('returns 404 for non-existent goal', async () => {
    const res = await app.request('/api/goals/999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quarterly',
        content: 'test',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid input', async () => {
    await postGoal()
    const res = await app.request('/api/goals/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'monthly' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/goals/:id', () => {
  it('deletes a goal', async () => {
    await postGoal()
    const res = await app.request('/api/goals/1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const listRes = await app.request('/api/goals')
    expect(await listRes.json()).toEqual([])
  })

  it('returns 404 for non-existent goal', async () => {
    const res = await app.request('/api/goals/999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
