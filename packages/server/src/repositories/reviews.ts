import { getDb, reviews, review_goals } from '@loopback/db'
import { count, desc, eq, max } from 'drizzle-orm'

import type { ReviewInput } from '../validators/reviews.js'

export function findAllReviews() {
  const db = getDb()
  return db.select().from(reviews).orderBy(desc(reviews.id)).all()
}

export function findReviewById(id: number) {
  const db = getDb()
  return db.select().from(reviews).where(eq(reviews.id, id)).get()
}

export function findRecentReviews(limit: number) {
  const db = getDb()
  return db.select().from(reviews).orderBy(desc(reviews.id)).limit(limit).all()
}

export function findGoalIdsByReviewId(reviewId: number): number[] {
  const db = getDb()
  return db
    .select({ goal_id: review_goals.goal_id })
    .from(review_goals)
    .where(eq(review_goals.review_id, reviewId))
    .all()
    .map((r) => r.goal_id)
}

export function insertReview(input: Omit<ReviewInput, 'goal_ids'>) {
  const db = getDb()
  return db
    .insert(reviews)
    .values({ type: input.type, content: input.content, date: input.date })
    .returning()
    .get()
}

export function insertReviewGoal(reviewId: number, goalId: number) {
  const db = getDb()
  db.insert(review_goals).values({ review_id: reviewId, goal_id: goalId }).run()
}

export function getReviewStats() {
  const db = getDb()
  return db
    .select({
      total: count(),
      last_reviewed_at: max(reviews.date),
    })
    .from(reviews)
    .get()!
}
