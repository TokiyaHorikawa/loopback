import { getDb, reviews, review_goals } from '@loopback/db'
import { and, count, desc, eq, gte, like, lte, max } from 'drizzle-orm'

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

export function findReviewsByGoalId(goalId: number, limit: number) {
  const db = getDb()
  return db
    .select({
      id: reviews.id,
      type: reviews.type,
      content: reviews.content,
      date: reviews.date,
      created_at: reviews.created_at,
    })
    .from(reviews)
    .innerJoin(review_goals, eq(reviews.id, review_goals.review_id))
    .where(eq(review_goals.goal_id, goalId))
    .orderBy(desc(reviews.id))
    .limit(limit)
    .all()
}

export interface FindReviewsFilters {
  limit: number
  query?: string
  from?: string
  to?: string
  type?: 'interim' | 'final'
}

export function findReviewsByFilters(filters: FindReviewsFilters) {
  const db = getDb()
  const conditions = []
  if (filters.query) conditions.push(like(reviews.content, `%${filters.query}%`))
  if (filters.from) conditions.push(gte(reviews.date, filters.from))
  if (filters.to) conditions.push(lte(reviews.date, filters.to))
  if (filters.type) conditions.push(eq(reviews.type, filters.type))

  return db
    .select()
    .from(reviews)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reviews.id))
    .limit(filters.limit)
    .all()
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
