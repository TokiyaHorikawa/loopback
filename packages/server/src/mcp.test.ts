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

describe('create_goal tool', () => {
  it('creates a goal and returns it', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'create_goal',
        arguments: {
          type: 'quarterly',
          content: 'Q1の目標',
          start_date: '2026-01-01',
          end_date: '2026-03-31',
        },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const goal = JSON.parse(body.result.content[0].text)
    expect(goal).toMatchObject({
      id: 1,
      type: 'quarterly',
      content: 'Q1の目標',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
    })
  })

  it('returns error for invalid type', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'create_goal',
        arguments: {
          type: 'monthly',
          content: '不正な目標',
          start_date: '2026-01-01',
          end_date: '2026-03-31',
        },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.isError).toBe(true)
  })
})

describe('find_reviews tool', () => {
  async function seedReviews() {
    await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quarterly',
        content: 'Goal',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      }),
    })
    await app.request('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'interim',
        content: 'プロジェクトが順調',
        date: '2026-03-01',
        goal_ids: [1],
      }),
    })
    await app.request('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'final',
        content: '目標を達成できた',
        date: '2026-03-31',
        goal_ids: [1],
      }),
    })
    await app.request('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'interim',
        content: '来月に向けて準備',
        date: '2026-04-15',
      }),
    })
  }

  it('returns all reviews up to limit when no filters', async () => {
    await mcpInitialize()
    await seedReviews()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 40,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 10 },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toHaveLength(3)
  })

  it('filters by query', async () => {
    await mcpInitialize()
    await seedReviews()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 41,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 10, query: '順調' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].content).toBe('プロジェクトが順調')
  })

  it('filters by date range', async () => {
    await mcpInitialize()
    await seedReviews()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 42,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 10, from: '2026-03-01', to: '2026-03-31' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toHaveLength(2)
  })

  it('filters by type', async () => {
    await mcpInitialize()
    await seedReviews()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 43,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 10, type: 'final' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].type).toBe('final')
  })

  it('combines multiple filters', async () => {
    await mcpInitialize()
    await seedReviews()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 44,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 10, type: 'interim', from: '2026-04-01' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].content).toBe('来月に向けて準備')
  })

  it('returns error for invalid date format', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 45,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 10, from: 'invalid' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.isError).toBe(true)
  })

  it('returns error when from > to', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 46,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 10, from: '2026-04-01', to: '2026-03-01' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.isError).toBe(true)
  })

  it('includes goal_ids in results', async () => {
    await mcpInitialize()
    await seedReviews()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 47,
      method: 'tools/call',
      params: {
        name: 'find_reviews',
        arguments: { limit: 1, type: 'final' },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews[0].goal_ids).toEqual([1])
  })
})

describe('list_reviews tool', () => {
  it('returns empty array when no reviews exist', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 30,
      method: 'tools/call',
      params: {
        name: 'list_reviews',
        arguments: { limit: 10 },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toEqual([])
  })

  it('returns recent reviews respecting limit', async () => {
    await mcpInitialize()

    // seed 3 reviews
    for (let i = 1; i <= 3; i++) {
      await app.request('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'interim',
          content: `Review ${i}`,
          date: `2026-03-0${i}`,
        }),
      })
    }

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 31,
      method: 'tools/call',
      params: {
        name: 'list_reviews',
        arguments: { limit: 2 },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toHaveLength(2)
    expect(reviews[0].content).toBe('Review 3')
    expect(reviews[1].content).toBe('Review 2')
  })

  it('filters by goal_id', async () => {
    await mcpInitialize()

    // seed 2 goals
    await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quarterly',
        content: 'Goal A',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      }),
    })
    await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quarterly',
        content: 'Goal B',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      }),
    })

    // review linked to goal 1
    await app.request('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'interim',
        content: 'Review for Goal A',
        date: '2026-03-10',
        goal_ids: [1],
      }),
    })
    // review linked to goal 2
    await app.request('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'interim',
        content: 'Review for Goal B',
        date: '2026-03-15',
        goal_ids: [2],
      }),
    })

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 32,
      method: 'tools/call',
      params: {
        name: 'list_reviews',
        arguments: { limit: 10, goal_id: 1 },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const reviews = JSON.parse(body.result.content[0].text)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].content).toBe('Review for Goal A')
    expect(reviews[0].goal_ids).toEqual([1])
  })

  it('returns error when limit is 0', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 33,
      method: 'tools/call',
      params: {
        name: 'list_reviews',
        arguments: { limit: 0 },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.isError).toBe(true)
  })
})

describe('save_review tool', () => {
  it('creates an interim review without goal_ids', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: {
        name: 'save_review',
        arguments: {
          type: 'interim',
          content: '今週は順調に進んだ',
          date: '2026-03-28',
        },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const review = JSON.parse(body.result.content[0].text)
    expect(review).toMatchObject({
      id: 1,
      type: 'interim',
      content: '今週は順調に進んだ',
      date: '2026-03-28',
      goal_ids: [],
    })
  })

  it('creates a final review with goal_ids', async () => {
    await mcpInitialize()

    // seed a goal
    await app.request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quarterly',
        content: 'Q1目標',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      }),
    })

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 21,
      method: 'tools/call',
      params: {
        name: 'save_review',
        arguments: {
          type: 'final',
          content: '目標を達成した',
          date: '2026-03-31',
          goal_ids: [1],
        },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const review = JSON.parse(body.result.content[0].text)
    expect(review).toMatchObject({
      id: 1,
      type: 'final',
      content: '目標を達成した',
      date: '2026-03-31',
      goal_ids: [1],
    })
  })

  it('returns error when final review has no goal_ids', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 22,
      method: 'tools/call',
      params: {
        name: 'save_review',
        arguments: {
          type: 'final',
          content: '目標を達成した',
          date: '2026-03-31',
        },
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.isError).toBe(true)
  })
})

describe('MCP prompts', () => {
  it('lists all prompts', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 50,
      method: 'prompts/list',
      params: {},
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const names = body.result.prompts.map((p: any) => p.name)
    expect(names).toContain('review')
    expect(names).toContain('review_final')
    expect(names).toContain('set_goal')
  })

  it('returns review prompt', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 51,
      method: 'prompts/get',
      params: { name: 'review' },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.messages).toHaveLength(1)
    expect(body.result.messages[0].role).toBe('user')
    expect(body.result.messages[0].content.text).toContain('get_context')
    expect(body.result.messages[0].content.text).toContain('save_review')
  })

  it('returns review_final prompt', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 52,
      method: 'prompts/get',
      params: { name: 'review_final' },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.messages).toHaveLength(1)
    expect(body.result.messages[0].role).toBe('user')
    expect(body.result.messages[0].content.text).toContain('list_reviews')
    expect(body.result.messages[0].content.text).toContain('save_review')
  })

  it('returns set_goal prompt', async () => {
    await mcpInitialize()

    const res = await mcpRequest({
      jsonrpc: '2.0',
      id: 53,
      method: 'prompts/get',
      params: { name: 'set_goal' },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.messages).toHaveLength(1)
    expect(body.result.messages[0].role).toBe('user')
    expect(body.result.messages[0].content.text).toContain('find_reviews')
    expect(body.result.messages[0].content.text).toContain('create_goal')
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
    await app.request('/api/goals', {
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
