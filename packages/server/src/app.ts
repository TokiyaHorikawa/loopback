import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { StreamableHTTPTransport } from '@hono/mcp'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

import { mcpServer } from './mcp.js'

const mcpTransport = new StreamableHTTPTransport({
  enableJsonResponse: true,
})
import contextRoute from './routes/context.js'
import goalsRoute from './routes/goals.js'
import reviewsRoute from './routes/reviews.js'

export const app = new Hono()

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

app.route('/api/context', contextRoute)
app.route('/api/goals', goalsRoute)
app.route('/api/reviews', reviewsRoute)

app.all('/mcp', async (c) => {
  if (!mcpServer.isConnected()) await mcpServer.connect(mcpTransport)
  return mcpTransport.handleRequest(c)
})

// Static file serving for Web UI
const webDistDir = path.resolve(fileURLToPath(import.meta.url), '../../..', 'web/dist')
const webDistRoot = path.relative(process.cwd(), webDistDir)
app.use('/*', serveStatic({ root: webDistRoot }))
app.get('/*', serveStatic({ root: webDistRoot, path: 'index.html' }))
