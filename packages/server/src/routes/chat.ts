import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

import {
  createSession,
  deleteSession,
  sendMessage,
  sessionExists,
  subscribeSession,
} from '../services/chat.js'
import { validateCreateSession, validateSendMessage } from '../validators/chat.js'

const app = new Hono()

app.post('/', async (c) => {
  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {}

  const validated = validateCreateSession(body)
  if ('error' in validated) return c.json({ error: validated.error }, 400)

  return c.json(createSession({ prompt: validated.data.prompt }), 201)
})

app.post('/:id/messages', async (c) => {
  const id = c.req.param('id')
  if (!sessionExists(id)) return c.json({ error: 'Session not found' }, 404)

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const validated = validateSendMessage(body)
  if ('error' in validated) return c.json({ error: validated.error }, 400)

  sendMessage(id, validated.data.content)
  return c.json({ ok: true })
})

app.get('/:id/stream', async (c) => {
  const id = c.req.param('id')
  if (!sessionExists(id)) return c.json({ error: 'Session not found' }, 404)

  return streamSSE(c, async (stream) => {
    await new Promise<void>((resolve) => {
      const unsubscribe = subscribeSession(id, (event) => {
        void stream.writeSSE({ data: JSON.stringify(event) })
      })
      if (!unsubscribe) {
        resolve()
        return
      }
      stream.onAbort(() => {
        unsubscribe()
        resolve()
      })
    })
  })
})

app.delete('/:id', (c) => {
  const id = c.req.param('id')
  if (!sessionExists(id)) return c.json({ error: 'Session not found' }, 404)
  deleteSession(id)
  return c.json({ ok: true })
})

export default app
