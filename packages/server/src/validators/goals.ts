export interface GoalInput {
  type: string
  content: string
  start_date: string
  end_date: string
}

export function validateGoalInput(
  body: Record<string, unknown>,
): { data: GoalInput } | { error: string } {
  const { type, content, start_date, end_date } = body

  if (!type || !content || !start_date || !end_date) {
    return { error: 'type, content, start_date, end_date are required' }
  }

  if (type !== 'annual' && type !== 'quarterly') {
    return { error: "type must be 'annual' or 'quarterly'" }
  }

  return {
    data: {
      type: type as string,
      content: content as string,
      start_date: start_date as string,
      end_date: end_date as string,
    },
  }
}
