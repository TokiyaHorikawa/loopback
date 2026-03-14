# ADR-0004: アーキテクチャの大枠を決定する

- **ステータス**: 承認
- **日付**: 2026-03-14

---

## コンテキスト

ADR-0001（MCP SSE採用）・ADR-0002（CLIラッパー）・ADR-0003（ふりかえり設計）の決定を受け、実際に実装に入るための技術スタックと起動構成を決定する。MCP設計は ADR-0005 に分離。

---

## 実装スタック

| コンポーネント    | 採用技術                          |
| ----------------- | --------------------------------- |
| API + MCPサーバー | TypeScript + Hono (Node.js)       |
| Web UI            | React + Vite (SPA)                |
| CLI               | TypeScript + npm (`npx loopback`) |
| DB                | SQLite (better-sqlite3)           |

TypeScript に一本化し、開発コストを最小にする。

---

## 起動構成

Dockerは使用しない。`npx loopback start` がNode.jsプロセスをホストで直接起動する。

```
npx loopback start
  └── Node.js プロセス (Hono)
       ├── REST API     — localhost:3000/api/*
       ├── MCP SSE      — localhost:3000/sse
       └── Static       — localhost:3000/  (Web UI)
  └── DB: ~/.loopback/loopback.db（ホストに直接置く）
```

- ターゲットユーザー（Claude Codeユーザー）はNode.jsが前提として成立するため、Docker不要
- DBファイルがホストに直接置かれるため、コンテナ削除によるデータ消失リスクがない
- ADR-0002のDocker前提を取り消し

---

## MCP設計

→ [ADR-0005](0005-mcp-prompts.md)

---

## 未決事項

- CLIの具体的なコマンド体系（`loopback start` 以外に何が必要か）
- Web UIの画面構成（どのデータをどう見せるか）
