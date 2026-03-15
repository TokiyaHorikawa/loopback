# 3-1 MCP Streamable HTTP エンドポイント実装計画

## Context

Issue #3 の最初のタスク。MCPプロトコルで Claude Code が Loopback に接続するための `/mcp` エンドポイントを追加する。ツール・プロンプトは後続PR（3-2〜3-7）で載せるため、このPRでは接続確立のみ。

## 変更ファイル

| ファイル                          | 操作 | 内容                                              |
| --------------------------------- | ---- | ------------------------------------------------- |
| `packages/server/package.json`    | 修正 | `@modelcontextprotocol/sdk` + `@hono/mcp` を追加  |
| `packages/server/src/mcp.ts`      | 新規 | McpServer インスタンス + transport のエクスポート |
| `packages/server/src/app.ts`      | 修正 | `/mcp` ルート追加                                 |
| `packages/server/src/mcp.test.ts` | 新規 | MCP initialize ハンドシェイクのテスト             |

## 手順

### 1. 依存追加

```bash
pnpm --filter @loopback/server add @modelcontextprotocol/sdk @hono/mcp
```

### 2. `packages/server/src/mcp.ts` を作成

McpServer と transport を初期化してエクスポート。後続PRでツール登録時に `mcpServer` をインポートできるようにする。

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@hono/mcp'

export const mcpServer = new McpServer({
  name: 'loopback',
  version: '0.0.1',
})

export const mcpTransport = new StreamableHTTPTransport()
```

### 3. `packages/server/src/app.ts` に `/mcp` ルート追加

```ts
import { mcpServer, mcpTransport } from './mcp.js'

app.all('/mcp', async (c) => {
  if (!mcpServer.isConnected()) await mcpServer.connect(mcpTransport)
  return mcpTransport.handleRequest(c)
})
```

REST API (`/api/*`) とは別の名前空間に置く。MCP はプロトコルエンドポイントであり REST route ではないため。

### 4. `packages/server/src/mcp.test.ts` を作成

MCP initialize リクエスト（JSON-RPC）を送り、200 + serverInfo が返ることを確認。DB モック不要。

### 5. 検証

```bash
pnpm typecheck && pnpm lint && pnpm fmt && pnpm test
```

## 設計判断

- **`mcp.ts` を `app.ts` と同階層に配置** — MCP はレイヤードアーキテクチャ（routes/validators/services/repositories）の外の関心。REST route とは別扱い
- **mcpServer をエクスポート** — 3-2〜3-7 で `import { mcpServer } from './mcp.js'` してツール・プロンプトを登録する導線
- **`@hono/mcp` v0.2.0 のリスク** — 薄い transport アダプタなので、問題が出ても差し替えは容易

## 注意点

- `mcpServer.isConnected()` が SDK に存在するか実装時に確認。なければ transport 側の API を確認
- テストでは `Accept: application/json` ヘッダを付けて JSON レスポンスを受ける（SSE ストリームではなく）
