import { getDb, goals, reviews, review_goals } from '@loopback/db'
import { and, count, desc, eq, lte, gte, max } from 'drizzle-orm'
import { Hono } from 'hono'

const app = new Hono()

function getGoalIds(db: ReturnType<typeof getDb>, reviewId: number): number[] {
  return db
    .select({ goal_id: review_goals.goal_id })
    .from(review_goals)
    .where(eq(review_goals.review_id, reviewId))
    .all()
    .map((r) => r.goal_id)
}

app.get('/', (c) => {
  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)

  const activeGoals = db
    .select()
    .from(goals)
    .where(and(lte(goals.start_date, today), gte(goals.end_date, today)))
    .all()

  const stats = db
    .select({
      total: count(),
      last_reviewed_at: max(reviews.date),
    })
    .from(reviews)
    .get()!

  const recentRows = db.select().from(reviews).orderBy(desc(reviews.id)).limit(5).all()

  const recentReviews = recentRows.map((row) => ({
    ...row,
    goal_ids: getGoalIds(db, row.id),
  }))

  return c.json({
    goals: activeGoals,
    review_stats: {
      total: stats.total,
      last_reviewed_at: stats.last_reviewed_at,
    },
    recent_reviews: recentReviews,
  })
})

export default app
