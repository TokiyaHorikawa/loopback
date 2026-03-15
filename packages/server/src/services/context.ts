import { getActiveGoals } from './goals.js'
import { getRecentReviews, getReviewStats } from './reviews.js'

export function getContext(today: string) {
  const stats = getReviewStats()
  return {
    goals: getActiveGoals(today),
    review_stats: {
      total: stats.total,
      last_reviewed_at: stats.last_reviewed_at,
    },
    recent_reviews: getRecentReviews(5),
  }
}
