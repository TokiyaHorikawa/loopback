# Loopback

Claudeと話しながらふりかえり、目標と日常のループを回すセルフマネジメントツール。

**目標設定 → 高頻度ふりかえり → ログ蓄積 → 次の目標設定が的確に → ...**

- ふりかえりはClaude（MCP経由）と対話しながら記録
- Web UIはログの閲覧・可視化（読み専）
- データはSQLiteでローカルに保持

## 必要なもの

- Node.js >= 24
- pnpm >= 10
- Claude Code または Claude Desktop App

## セットアップ

```sh
git clone https://github.com/TokiyaHorikawa/loopback.git
cd loopback
pnpm install
pnpm --filter @loopback/web build
```

## 起動

```sh
# サーバー起動（API + Web UI）
pnpm dev:server
```

`http://localhost:3000/` で Web UI、`http://localhost:3000/api/*` で REST API にアクセスできます。

### 開発モード（Web UIのホットリロード付き）

ターミナルを2つ開いて:

```sh
# ターミナル1: APIサーバー
pnpm dev:server

# ターミナル2: Vite devサーバー（ホットリロード）
pnpm --filter @loopback/web dev
```

Vite devサーバー（`http://localhost:5173/`）は `/api` リクエストを自動的にポート3000にプロキシします。

## MCP接続

### Claude Code

`claude mcp add` でサーバーを登録:

```sh
claude mcp add loopback --transport http http://localhost:3000/mcp
```

### Claude Desktop App

`claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "loopback": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### MCPツール

| ツール         | 説明                                                   |
| -------------- | ------------------------------------------------------ |
| `get_context`  | アクティブな目標・最近のふりかえり等のコンテキスト取得 |
| `create_goal`  | 目標の作成                                             |
| `save_review`  | ふりかえりの保存                                       |
| `list_reviews` | ふりかえり一覧の取得                                   |
| `find_reviews` | ふりかえりの横断検索                                   |

### MCPプロンプト

| プロンプト     | 説明                 |
| -------------- | -------------------- |
| `review`       | 中間ふりかえりの進行 |
| `review_final` | 最終ふりかえりの進行 |
| `set_goal`     | 目標設定のサポート   |

## 開発コマンド

```sh
pnpm test        # テスト実行
pnpm typecheck   # 型チェック
pnpm lint        # リント
pnpm fmt         # フォーマット
pnpm build       # 全パッケージビルド
```

## パッケージ構成

```
packages/
  db/       — Drizzle ORM スキーマ・マイグレーション（SQLite）
  server/   — Hono REST API + MCPサーバー
  web/      — React + Vite SPA（読み専UI）
  cli/      — npx CLIラッパー（開発中）
```

## ドキュメント

- [docs/overview.md](docs/overview.md) — プロジェクトのコンセプトと設計方針
- [docs/adr/](docs/adr/) — アーキテクチャ決定記録（ADR）
