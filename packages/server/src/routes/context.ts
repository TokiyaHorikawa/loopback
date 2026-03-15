import { Hono } from 'hono'

import { getActiveGoals } from '../services/goals.js'
import { getReviewStats, getRecentReviews } from '../services/reviews.js'

const app = new Hono()

app.get('/', (c) => {
  const today = new Date().toISOString().slice(0, 10)
  const stats = getReviewStats()

  return c.json({
    goals: getActiveGoals(today),
    review_stats: {
      total: stats.total,
      last_reviewed_at: stats.last_reviewed_at,
    },
    recent_reviews: getRecentReviews(5),
  })
})

export default app
