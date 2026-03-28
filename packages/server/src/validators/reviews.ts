type ReviewType = 'interim' | 'final'

export interface ReviewInput {
  type: ReviewType
  content: string
  date: string
  goal_ids: number[]
}

export interface ListReviewsInput {
  limit: number
  goal_id?: number
}

export function validateListReviewsInput(
  body: Record<string, unknown>,
): { data: ListReviewsInput } | { error: string } {
  const { limit, goal_id } = body

  if (typeof limit !== 'number' || limit < 1) {
    return { error: 'limit must be a positive number' }
  }

  if (goal_id !== undefined && (typeof goal_id !== 'number' || goal_id < 1)) {
    return { error: 'goal_id must be a positive number' }
  }

  return {
    data: { limit, goal_id: goal_id as number | undefined },
  }
}

export function validateReviewInput(
  body: Record<string, unknown>,
): { data: ReviewInput } | { error: string } {
  const { type, content, date } = body

  if (!type || !content || !date) {
    return { error: 'type, content, date are required' }
  }

  if (type !== 'interim' && type !== 'final') {
    return { error: "type must be 'interim' or 'final'" }
  }

  const goalIds = (body.goal_ids as number[] | undefined) ?? []

  if (type === 'final' && goalIds.length !== 1) {
    return { error: 'final review requires exactly 1 goal_id' }
  }

  return {
    data: {
      type,
      content: content as string,
      date: date as string,
      goal_ids: goalIds,
    },
  }
}
