# CLAUDE.md

## ドキュメント

- `docs/overview.md` — プロジェクトのコンセプト・アーキテクチャ・設計方針の全体像
- `docs/adr/` — 設計判断の背景と根拠が蓄積されたADR。設計意図を確認したいときはここを参照する

## パッケージ構成

`db` ← `server` ← `cli`、`web` は独立

## 開発

- pnpm monorepo。ルートの `pnpm dev` / `build` / `test` 等は vite-plus (`vp`) 経由で全パッケージに伝播
- 単体で動かすときは `pnpm --filter @loopback/<pkg> <script>`
- DB スキーマ変更: `pnpm --filter @loopback/db generate` → `migrate`

## サーバーアーキテクチャ（ADR-0006）

packages/server/src/ は4レイヤー構成:

- `routes/` — HTTP の受け取り・レスポンス返却。validator → service → JSON返却
- `validators/` — リクエストボディの検証・パース。DB アクセス禁止
- `services/` — ビジネスロジック。複数 repository の組み合わせ。単純CRUDはそのまま委譲
- `repositories/` — DB クエリの構築・実行。drizzle 操作はここに閉じる

依存方向: routes → validators, routes → services → repositories（逆方向禁止）

## テスト・品質

- `pnpm test`（Vitest）/ `pnpm lint` / `pnpm fmt` / `pnpm typecheck`
- DB テストは in-memory SQLite
- コードスタイル: セミコロンなし、シングルクォート
- pre-commit（lefthook）で lint, format check, typecheck が走る
