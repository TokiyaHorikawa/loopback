import { ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getPromptText } from '../mcp.js'

const mcpConfigPath = join(tmpdir(), 'loopback-mcp-config.json')
mkdirSync(tmpdir(), { recursive: true })
writeFileSync(
  mcpConfigPath,
  JSON.stringify({
    mcpServers: {
      loopback: { type: 'http', url: 'http://localhost:3000/mcp' },
    },
  }),
)

export type ChatEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_use'; name: string; input: unknown }
  | { type: 'tool_result'; name: string; output: string }
  | { type: 'done'; sessionId: string }
  | { type: 'error'; message: string }

type ChatSession = {
  claudeSessionId: string | null
  systemPrompt: string | null
  emitter: EventEmitter
  proc: ChildProcess | null
}

const sessions = new Map<string, ChatSession>()

const activeProcs = new Set<ChildProcess>()

function killAllProcs() {
  for (const proc of activeProcs) {
    proc.kill()
  }
  activeProcs.clear()
}

process.on('SIGINT', () => {
  killAllProcs()
  process.exit(0)
})
process.on('SIGTERM', () => {
  killAllProcs()
  process.exit(0)
})

export function createSession(options?: { prompt?: string }): { id: string } {
  const id = crypto.randomUUID()
  const systemPrompt = options?.prompt ? (getPromptText(options.prompt) ?? null) : null
  const session: ChatSession = {
    claudeSessionId: null,
    systemPrompt,
    emitter: new EventEmitter(),
    proc: null,
  }
  session.emitter.setMaxListeners(5)
  sessions.set(id, session)
  return { id }
}

export function sessionExists(id: string): boolean {
  return sessions.has(id)
}

export function subscribeSession(
  id: string,
  listener: (event: ChatEvent) => void,
): (() => void) | null {
  const session = sessions.get(id)
  if (!session) return null
  session.emitter.on('event', listener)
  return () => session.emitter.off('event', listener)
}

export function sendMessage(sessionId: string, content: string): void {
  const session = sessions.get(sessionId)
  if (!session) throw new Error('Session not found')

  const args: string[] = [
    '--print',
    '--verbose',
    '--output-format',
    'stream-json',
    '--mcp-config',
    mcpConfigPath,
    '--permission-mode',
    'bypassPermissions',
  ]

  if (session.systemPrompt && !session.claudeSessionId) {
    args.push('--system-prompt', session.systemPrompt)
  }

  if (session.claudeSessionId) {
    args.push('--resume', session.claudeSessionId)
  }

  args.push(content)

  const toolNames = new Map<string, string>()
  console.log('[chat] spawning claude with args:', args)
  const proc = spawn('claude', args)
  session.proc = proc
  activeProcs.add(proc)
  let buffer = ''
  let stderrBuf = ''

  proc.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    console.log('[chat] stdout:', text)
    buffer += text
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        processLine(session, JSON.parse(line) as Record<string, unknown>, toolNames)
      } catch {}
    }
  })

  proc.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    console.error('[chat] stderr:', text)
    stderrBuf += text
  })

  proc.on('error', (err) => {
    console.error('[chat] spawn error:', err)
    const message =
      (err as NodeJS.ErrnoException).code === 'ENOENT'
        ? 'Claude Code をインストールしてください'
        : err.message
    emit(session, { type: 'error', message })
  })

  proc.on('close', (code) => {
    activeProcs.delete(proc)
    session.proc = null
    console.log('[chat] process exited with code:', code)
    if (buffer.trim()) {
      try {
        processLine(session, JSON.parse(buffer) as Record<string, unknown>, toolNames)
      } catch {}
    }
    if (code !== 0 && code !== null) {
      const errMsg = stderrBuf.trim()
      emit(session, {
        type: 'error',
        message: errMsg || `claude exited with code ${code}`,
      })
    }
  })
}

function emit(session: ChatSession, event: ChatEvent): void {
  session.emitter.emit('event', event)
}

function processLine(
  session: ChatSession,
  line: Record<string, unknown>,
  toolNames: Map<string, string>,
): void {
  if (line.type === 'assistant') {
    const msg = line.message as { content: Array<Record<string, unknown>> } | undefined
    for (const block of msg?.content ?? []) {
      if (block.type === 'text' && typeof block.text === 'string') {
        emit(session, { type: 'text', content: block.text })
      } else if (
        block.type === 'tool_use' &&
        typeof block.name === 'string' &&
        typeof block.id === 'string'
      ) {
        toolNames.set(block.id, block.name)
        emit(session, { type: 'tool_use', name: block.name, input: block.input ?? {} })
      }
    }
  } else if (line.type === 'user') {
    const msg = line.message as { content: Array<Record<string, unknown>> } | undefined
    for (const block of msg?.content ?? []) {
      if (block.type === 'tool_result') {
        const toolUseId = typeof block.tool_use_id === 'string' ? block.tool_use_id : ''
        const name = toolNames.get(toolUseId) ?? 'unknown'
        const output =
          typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '')
        emit(session, { type: 'tool_result', name, output })
      }
    }
  } else if (line.type === 'result') {
    const sessionId = typeof line.session_id === 'string' ? line.session_id : ''
    if (sessionId) session.claudeSessionId = sessionId
    emit(session, { type: 'done', sessionId })
  }
}

export function deleteSession(id: string): void {
  const session = sessions.get(id)
  if (session) {
    if (session.proc) {
      session.proc.kill()
      activeProcs.delete(session.proc)
    }
    session.emitter.removeAllListeners()
    sessions.delete(id)
  }
}
