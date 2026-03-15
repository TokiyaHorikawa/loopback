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

import { app } from './app.js'

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

function mcpRequest(body: unknown) {
  return app.request('/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  })
}

async function mcpInitialize() {
  await mcpRequest({
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.0.1' },
    },
  })
}

describe('MCP Streamable HTTP', () => {
  it('handles initialize handshake', async () => {
    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '0.0.1' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        serverInfo: { name: 'loopback', version: '0.0.1' },
      },
    })
  })
})

describe('get_context tool', () => {
  it('returns empty context when no data exists', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'get_context' },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const content = JSON.parse(body.result.content[0].text)
    expect(content).toEqual({
      goals: [],
      review_stats: { total: 0, last_reviewed_at: null },
      recent_reviews: [],
    })
  })

  it('returns active goals and review data', async () => {
    await mcpInitialize()

    // seed data
    app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quarterly',
        content: 'Active goal',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      }),
    })
    await app.request('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'interim',
        content: 'Recent review',
        date: '2026-03-10',
        goal_ids: [1],
      }),
    })

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'get_context' },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const content = JSON.parse(body.result.content[0].text)
    expect(content.goals).toHaveLength(1)
    expect(content.goals[0].content).toBe('Active goal')
    expect(content.review_stats.total).toBe(1)
    expect(content.recent_reviews).toHaveLength(1)
    expect(content.recent_reviews[0].goal_ids).toEqual([1])
  })
})
