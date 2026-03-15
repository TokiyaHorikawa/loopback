import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { getContext } from './services/context.js'

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

export const mcpTransport = new StreamableHTTPTransport({
  enableJsonResponse: true,
})
