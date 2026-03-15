type ReviewType = 'interim' | 'final'

export interface ReviewInput {
  type: ReviewType
  content: string
  date: string
  goal_ids: number[]
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
