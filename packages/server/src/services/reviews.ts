import * as repo from '../repositories/reviews.js'
import type { ReviewInput } from '../validators/reviews.js'

export function listReviews() {
  const rows = repo.findAllReviews()
  return rows.map((row) => ({
    ...row,
    goal_ids: repo.findGoalIdsByReviewId(row.id),
  }))
}

export function getReview(id: number) {
  const row = repo.findReviewById(id)
  if (!row) return null
  return { ...row, goal_ids: repo.findGoalIdsByReviewId(row.id) }
}

export function getRecentReviews(limit: number) {
  const rows = repo.findRecentReviews(limit)
  return rows.map((row) => ({
    ...row,
    goal_ids: repo.findGoalIdsByReviewId(row.id),
  }))
}

export function getReviewStats() {
  return repo.getReviewStats()
}

export function createReview(input: ReviewInput) {
  const result = repo.insertReview(input)

  for (const goalId of input.goal_ids) {
    repo.insertReviewGoal(result.id, goalId)
  }

  return { ...result, goal_ids: input.goal_ids }
}
