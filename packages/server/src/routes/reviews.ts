import { Hono } from 'hono'

import {
  listReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
} from '../services/reviews.js'
import { validateReviewInput } from '../validators/reviews.js'

const app = new Hono()

app.get('/', (c) => {
  return c.json(listReviews())
})

app.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const review = getReview(id)
  if (!review) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json(review)
})

app.post('/', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const validated = validateReviewInput(body)
  if ('error' in validated) {
    return c.json({ error: validated.error }, 400)
  }

  return c.json(createReview(validated.data), 201)
})

app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const validated = validateReviewInput(body)
  if ('error' in validated) {
    return c.json({ error: validated.error }, 400)
  }

  const result = updateReview(id, validated.data)
  if (!result) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json(result)
})

app.delete('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const result = deleteReview(id)
  if (!result) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json({ ok: true })
})

export default app
