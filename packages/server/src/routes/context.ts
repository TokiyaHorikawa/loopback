import { Hono } from 'hono'

import { getContext } from '../services/context.js'

const app = new Hono()

app.get('/', (c) => {
  const today = new Date().toISOString().slice(0, 10)
  return c.json(getContext(today))
})

export default app
