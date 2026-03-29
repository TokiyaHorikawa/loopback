type PromptType = 'review' | 'review_final' | 'set_goal'

export type CreateSessionData = {
  prompt?: PromptType
}

export type SendMessageData = {
  content: string
}

const VALID_PROMPTS: PromptType[] = ['review', 'review_final', 'set_goal']

export function validateCreateSession(
  body: Record<string, unknown>,
): { data: CreateSessionData } | { error: string } {
  if (body.prompt !== undefined && !VALID_PROMPTS.includes(body.prompt as PromptType)) {
    return { error: `prompt は ${VALID_PROMPTS.join(', ')} のいずれかです` }
  }
  return { data: { prompt: body.prompt as PromptType | undefined } }
}

export function validateSendMessage(
  body: Record<string, unknown>,
): { data: SendMessageData } | { error: string } {
  if (typeof body.content !== 'string' || !body.content.trim()) {
    return { error: 'content は空にできません' }
  }
  return { data: { content: body.content } }
}
