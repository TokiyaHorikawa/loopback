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

export interface FindReviewsInput {
  limit: number
  query?: string
  from?: string
  to?: string
  type?: ReviewType
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/

export function validateFindReviewsInput(
  body: Record<string, unknown>,
): { data: FindReviewsInput } | { error: string } {
  const { limit, query, from, to, type } = body

  if (typeof limit !== 'number' || limit < 1) {
    return { error: 'limit must be a positive number' }
  }

  if (from !== undefined && (typeof from !== 'string' || !datePattern.test(from))) {
    return { error: 'from must be a date string (YYYY-MM-DD)' }
  }

  if (to !== undefined && (typeof to !== 'string' || !datePattern.test(to))) {
    return { error: 'to must be a date string (YYYY-MM-DD)' }
  }

  if (from && to && from > to) {
    return { error: 'from must be before or equal to to' }
  }

  if (type !== undefined && type !== 'interim' && type !== 'final') {
    return { error: "type must be 'interim' or 'final'" }
  }

  return {
    data: {
      limit,
      query: query as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      type: type as ReviewType | undefined,
    },
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
