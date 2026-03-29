export type Goal = {
  id: number
  type: 'annual' | 'quarterly'
  content: string
  start_date: string
  end_date: string
  created_at: string
}

export type Review = {
  id: number
  type: 'interim' | 'final'
  content: string
  date: string
  created_at: string
  goal_ids: number[]
}

export type ContextResponse = {
  goals: Goal[]
  review_stats: { total: number; last_reviewed_at: string | null }
  recent_reviews: Review[]
}
