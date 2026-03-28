import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { getContext } from './services/context.js'
import { createGoal } from './services/goals.js'
import {
  createReview,
  getRecentReviews,
  getReviewsByGoalId,
  searchReviews,
} from './services/reviews.js'
import { validateGoalInput } from './validators/goals.js'
import {
  validateFindReviewsInput,
  validateListReviewsInput,
  validateReviewInput,
} from './validators/reviews.js'

export const mcpServer = new McpServer({
  name: 'loopback',
  version: '0.0.1',
})

mcpServer.registerTool(
  'get_context',
  {
    description: 'アクティブな目標 + レビュー統計 + 直近5件を返す',
  },
  () => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      content: [{ type: 'text', text: JSON.stringify(getContext(today)) }],
    }
  },
)

mcpServer.registerTool(
  'create_goal',
  {
    description: 'type, content, start_date, end_date で目標を保存する',
    inputSchema: {
      type: z.enum(['annual', 'quarterly']),
      content: z.string(),
      start_date: z.string(),
      end_date: z.string(),
    },
  },
  ({ type, content, start_date, end_date }) => {
    const validated = validateGoalInput({ type, content, start_date, end_date })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const goal = createGoal(validated.data)
    return {
      content: [{ type: 'text', text: JSON.stringify(goal) }],
    }
  },
)

mcpServer.registerTool(
  'save_review',
  {
    description: 'type, content, date, goal_ids? でふりかえりを保存する',
    inputSchema: {
      type: z.enum(['interim', 'final']),
      content: z.string(),
      date: z.string(),
      goal_ids: z.array(z.number()).optional(),
    },
  },
  ({ type, content, date, goal_ids }) => {
    const validated = validateReviewInput({ type, content, date, goal_ids })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const review = createReview(validated.data)
    return {
      content: [{ type: 'text', text: JSON.stringify(review) }],
    }
  },
)

mcpServer.registerTool(
  'list_reviews',
  {
    description: 'limit, goal_id? でレビュー履歴を取得する',
    inputSchema: {
      limit: z.number(),
      goal_id: z.number().optional(),
    },
  },
  ({ limit, goal_id }) => {
    const validated = validateListReviewsInput({ limit, goal_id })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const reviews = validated.data.goal_id
      ? getReviewsByGoalId(validated.data.goal_id, validated.data.limit)
      : getRecentReviews(validated.data.limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(reviews) }],
    }
  },
)

mcpServer.registerTool(
  'find_reviews',
  {
    description: 'limit, query?, from?, to?, type? で横断的にふりかえりを検索する',
    inputSchema: {
      limit: z.number(),
      query: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      type: z.enum(['interim', 'final']).optional(),
    },
  },
  ({ limit, query, from, to, type }) => {
    const validated = validateFindReviewsInput({ limit, query, from, to, type })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const reviews = searchReviews(validated.data)
    return {
      content: [{ type: 'text', text: JSON.stringify(reviews) }],
    }
  },
)

export const mcpTransport = new StreamableHTTPTransport({
  enableJsonResponse: true,
})
