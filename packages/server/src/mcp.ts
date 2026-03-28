import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { getContext } from './services/context.js'
import { createGoal } from './services/goals.js'
import { validateGoalInput } from './validators/goals.js'

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

export const mcpTransport = new StreamableHTTPTransport({
  enableJsonResponse: true,
})
