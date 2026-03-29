import { Hono } from 'hono'

import { listGoals, getGoal, createGoal, updateGoal, deleteGoal } from '../services/goals.js'
import { validateGoalInput } from '../validators/goals.js'

const app = new Hono()

app.get('/', (c) => {
  return c.json(listGoals())
})

app.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const goal = getGoal(id)
  if (!goal) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json(goal)
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

app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
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

  const result = updateGoal(id, validated.data)
  if (!result) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json(result)
})

app.delete('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const result = deleteGoal(id)
  if (!result) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json({ ok: true })
})

export default app
