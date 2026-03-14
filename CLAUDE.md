# CLAUDE.md

## ドキュメント

- `docs/overview.md` — プロジェクトのコンセプト・アーキテクチャ・設計方針の全体像
- `docs/adr/` — 設計判断の背景と根拠が蓄積されたADR。設計意図を確認したいときはここを参照する

## 開発

- pnpm monorepo。ルートの `pnpm dev` / `build` / `test` 等は vite-plus (`vp`) 経由で全パッケージに伝播
- 単体で動かすときは `pnpm --filter @loopback/<pkg> <script>`
- DB スキーマ変更: `pnpm --filter @loopback/db generate` → `migrate`
