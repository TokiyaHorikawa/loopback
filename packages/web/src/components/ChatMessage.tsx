import type { Message } from '../hooks/useChat'

type ChatMessageProps = {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`chat-message chat-message-${message.role}`}>
      <div className="chat-bubble">
        {message.content && <p className="chat-text">{message.content}</p>}
        {message.toolCalls?.map((tool, i) => (
          <details key={i} className="tool-card">
            <summary className="tool-card-summary">
              <span className="tool-name">{tool.name}</span>
              <span className="tool-status">{tool.output !== undefined ? ' ✓' : ' …'}</span>
            </summary>
            <div className="tool-card-body">
              <div className="tool-section">
                <span className="tool-label">入力</span>
                <pre className="tool-code">{JSON.stringify(tool.input, null, 2)}</pre>
              </div>
              {tool.output !== undefined && (
                <div className="tool-section">
                  <span className="tool-label">結果</span>
                  <pre className="tool-code">{tool.output}</pre>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
