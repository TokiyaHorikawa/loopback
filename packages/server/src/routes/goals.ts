import { Hono } from 'hono'

import { listGoals, createGoal } from '../services/goals.js'
import { validateGoalInput } from '../validators/goals.js'

const app = new Hono()

app.get('/', (c) => {
  return c.json(listGoals())
})

app.post('/', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const validated = validateGoalInput(body)
  if ('error' in validated) {
    return c.json({ error: validated.error }, 400)
  }

  return c.json(createGoal(validated.data), 201)
})

export default app
