import { Hono } from 'hono'

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
