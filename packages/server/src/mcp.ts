import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const mcpServer = new McpServer({
  name: 'loopback',
  version: '0.0.1',
})

export const mcpTransport = new StreamableHTTPTransport({
  enableJsonResponse: true,
})
