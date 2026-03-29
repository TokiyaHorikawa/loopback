import { useCallback, useEffect, useRef, useState } from 'react'

import { ChatMessage } from '../components/ChatMessage'
import { useChat } from '../hooks/useChat'

type PromptType = 'review' | 'review_final' | 'set_goal' | 'free'

const PROMPT_LABELS: Record<PromptType, string> = {
  review: '中間ふりかえり',
  review_final: '最終ふりかえり',
  set_goal: '目標設定',
  free: '自由に相談',
}

const PROMPT_TYPES = Object.keys(PROMPT_LABELS) as PromptType[]

type ChatPageProps = {
  initialPrompt?: string
}

export function ChatPage({ initialPrompt }: ChatPageProps) {
  const { messages, status, error, sessionId, startSession, sendMessage, endSession } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoStarted = useRef(false)

  useEffect(() => {
    if (initialPrompt !== undefined && !autoStarted.current) {
      autoStarted.current = true
      const prompt =
        initialPrompt === 'review' ||
        initialPrompt === 'review_final' ||
        initialPrompt === 'set_goal'
          ? (initialPrompt as 'review' | 'review_final' | 'set_goal')
          : undefined
      void startSession(prompt)
    }
  }, [initialPrompt, startSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || status === 'streaming' || status === 'loading') return
    setInput('')
    await sendMessage(content)
  }, [input, status, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  const handleSelectPrompt = useCallback(
    async (prompt: PromptType) => {
      await startSession(prompt === 'free' ? undefined : prompt)
    },
    [startSession],
  )

  if (!sessionId && status !== 'loading' && status !== 'error') {
    return (
      <div className="chat-start">
        <h2 className="chat-start-title">何をしますか？</h2>
        <div className="chat-prompt-grid">
          {PROMPT_TYPES.map((p) => (
            <button key={p} className="chat-prompt-btn" onClick={() => void handleSelectPrompt(p)}>
              {PROMPT_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {status === 'loading' && messages.length === 0 && <p className="loading">接続中...</p>}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          placeholder="メッセージを入力... (Enter で送信、Shift+Enter で改行)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={status === 'loading'}
          rows={3}
        />
        <div className="chat-input-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => void endSession()}>
            終了
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void handleSend()}
            disabled={!input.trim() || status === 'streaming' || status === 'loading'}
          >
            {status === 'streaming' ? '応答中...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  )
}
