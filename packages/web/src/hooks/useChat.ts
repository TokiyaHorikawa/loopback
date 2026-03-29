import { useCallback, useEffect, useRef, useState } from 'react'

export type ToolCall = {
  name: string
  input: unknown
  output?: string
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

type ChatStatus = 'idle' | 'loading' | 'streaming' | 'error'

type PromptType = 'review' | 'review_final' | 'set_goal'

type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_use'; name: string; input: unknown }
  | { type: 'tool_result'; output: string }
  | { type: 'done'; sessionId: string }
  | { type: 'error'; message: string }

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connectSSE = useCallback((id: string) => {
    const es = new EventSource(`/api/chat/${id}/stream`)
    eventSourceRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as StreamEvent

      if (event.type === 'text') {
        setStatus('streaming')
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && !last.toolCalls?.length) {
            return [...prev.slice(0, -1), { ...last, content: last.content + event.content }]
          }
          return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: event.content }]
        })
      } else if (event.type === 'tool_use') {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          const toolCall: ToolCall = { name: event.name, input: event.input }
          if (last?.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, toolCalls: [...(last.toolCalls ?? []), toolCall] },
            ]
          }
          return [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', content: '', toolCalls: [toolCall] },
          ]
        })
      } else if (event.type === 'tool_result') {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.toolCalls?.length) {
            const toolCalls = [...last.toolCalls]
            let idx = -1
            for (let j = toolCalls.length - 1; j >= 0; j--) {
              if (toolCalls[j].output === undefined) {
                idx = j
                break
              }
            }
            if (idx >= 0) {
              toolCalls[idx] = { ...toolCalls[idx], output: event.output }
            }
            return [...prev.slice(0, -1), { ...last, toolCalls }]
          }
          return prev
        })
      } else if (event.type === 'done') {
        setStatus('idle')
      } else if (event.type === 'error') {
        setError(event.message)
        setStatus('error')
      }
    }

    es.onerror = () => {
      // 接続エラーは EventSource が自動再接続するため無視
    }
  }, [])

  const startSession = useCallback(
    async (prompt?: PromptType) => {
      setStatus('loading')
      setError(null)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })
        const data = (await res.json()) as { id: string; error?: string }
        if (!res.ok) {
          setError(data.error ?? 'セッションの作成に失敗しました')
          setStatus('error')
          return
        }
        sessionIdRef.current = data.id
        setSessionId(data.id)
        connectSSE(data.id)
        setStatus('idle')
      } catch {
        setError('サーバーへの接続に失敗しました')
        setStatus('error')
      }
    },
    [connectSSE],
  )

  const sendMessage = useCallback(async (content: string) => {
    const id = sessionIdRef.current
    if (!id || !content.trim()) return

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content }])
    setStatus('streaming')

    try {
      const res = await fetch(`/api/chat/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'メッセージの送信に失敗しました')
        setStatus('error')
      }
    } catch {
      setError('サーバーへの接続に失敗しました')
      setStatus('error')
    }
  }, [])

  const endSession = useCallback(async () => {
    const id = sessionIdRef.current
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    sessionIdRef.current = null
    setSessionId(null)
    setMessages([])
    setStatus('idle')
    setError(null)
    if (id) {
      await fetch(`/api/chat/${id}`, { method: 'DELETE' }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
      const id = sessionIdRef.current
      if (id) {
        fetch(`/api/chat/${id}`, { method: 'DELETE' }).catch(() => {})
      }
    }
  }, [])

  return { messages, status, error, sessionId, startSession, sendMessage, endSession }
}
