# ADR-0007: MCP transport を Streamable HTTP に変更する

- **ステータス**: 設計中
- **日付**: 2026-03-15

---

## コンテキスト

ADR-0001 では AI 接続方式として MCP (SSE) を採用した。しかし MCP 仕様の更新（2025-03-26）により SSE transport は deprecated となり、**Streamable HTTP** が後継として標準化された。2026年3月現在、SSE は公式ドキュメントで legacy 扱いとなっている。

新規実装にあたり、transport 方式を再評価する必要がある。

---

## 検討した選択肢

### 1. SSE（ADR-0001 の当初方針を維持）

`/sse`（常時接続）+ `/messages`（POST）の2エンドポイント構成。

- (+) ADR-0001 で決定済み、方針変更が不要
- (-) MCP 仕様で deprecated。今後クライアント側のサポートが縮小するリスク
- (-) 常時接続の管理が必要で、Hono との統合がやや煩雑

### 2. Streamable HTTP

`/mcp` 単一エンドポイントに POST。レスポンスが必要に応じて SSE ストリームになる。

- (+) MCP 仕様の現行推奨。Claude Code を含む主要クライアントが対応済み
- (+) エンドポイントが1つで済む。通常の HTTP POST ハンドラなので Hono と相性が良い
- (+) Hono 向けミドルウェアが複数存在し（`@hono/mcp`, `@modelcontextprotocol/hono`）、統合コストが低い
- (-) ADR-0001 からの方針変更になる

---

## 決定

**Streamable HTTP を採用する。** エンドポイントは `/mcp`。

ADR-0001 の「MCP をAI接続方式とする」決定は維持し、transport のみ SSE → Streamable HTTP に変更する。ADR-0004 の起動構成も以下のように読み替える:

```
npx loopback start
  └── Node.js プロセス (Hono)
       ├── REST API     — localhost:3000/api/*
       ├── MCP          — localhost:3000/mcp    ← /sse から変更
       └── Static       — localhost:3000/  (Web UI)
```

---

## 実装方針

### ライブラリ選定

Hono 向け MCP ミドルウェアは2つ存在する:

|              | `@hono/mcp`                            | `@modelcontextprotocol/hono` |
| ------------ | -------------------------------------- | ---------------------------- |
| メンテナ     | Hono コミュニティ（honojs/middleware） | MCP SDK チーム               |
| 統合スタイル | 既存 app にルート追加                  | app を丸ごと生成             |
| Hono Context | そのまま使える（fetch API ネイティブ） | 内部で Node.js 変換          |
| 認証         | OAuth + Bearer auth                    | Host ヘッダ検証              |

**`@hono/mcp` を採用する。** Loopback は既存の Hono app に REST API を載せており、そこに `/mcp` を1ルート追加する形が自然。MCP プロトコル実装は両方とも `@modelcontextprotocol/sdk` の `McpServer` を使うため、プロトコル層の違いはない。

### 構成

```ts
// app.ts のイメージ
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@hono/mcp'

const mcpServer = new McpServer({ name: 'loopback', version: '1.0.0' })
const transport = new StreamableHTTPTransport()

app.all('/mcp', async (c) => {
  if (!mcpServer.isConnected()) await mcpServer.connect(transport)
  return transport.handleRequest(c)
})
```

- ツール・プロンプトの登録は別タスク（Issue #3 の 3-2〜3-7）で行う

---

## 根拠

- **deprecated な仕様を新規採用する理由がない** — SSE は legacy 扱いであり、今後のエコシステムの進化から取り残されるリスクがある
- **`@hono/mcp` の採用** — 既存の Hono app にルートを追加するスタイルが Loopback の構成と合致する。fetch API ネイティブで Node.js 変換が不要
- **シンプルさ** — 常時接続の管理が不要で、通常の HTTP ハンドラとして扱える。エンドポイントも1つで済む
- **ローカル用途では十分** — 2026年ロードマップで議論されているステートレス水平スケールの課題は、Loopback のようなローカル単一プロセス構成では該当しない
