import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { mcpServer } from './mcp.js'

export async function runStdio() {
  const transport = new StdioServerTransport()
  await mcpServer.connect(transport)
}
