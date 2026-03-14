# ADR-0002: 起動体験としてCLIラッパーを提供する

- **ステータス**: 一部取り消し → [ADR-0004](0004-architecture.md) に統合
- **日付**: 2026-03-14

---

## コンテキスト

LoopbackはDockerで動作するが、ターゲットユーザーはエンジニアリングに詳しくない人も含む。
`docker compose up` を直接叩かせるのはハードルが高い。

`supabase start` のように、CLIラッパーを提供して起動を簡単にしたい。

## 検討した選択肢

### 1. `docker compose up` をそのまま使う

- (+) 追加実装が不要
- (-) Dockerの知識が必要
- (-) 初回セットアップ（設定ファイル、ボリューム等）をユーザーが自分でやる必要がある

### 2. CLIラッパーを提供する（`loopback start`）

`loopback start` 一発で起動できるCLIツールを提供する。内部的にはDockerを操作するが、ユーザーはDockerを意識しない。

- (+) 非エンジニアでも気軽に使える
- (+) 初回セットアップ（DB初期化、設定ファイル生成等）もCLIで完結できる
- (+) `loopback stop` / `loopback update` 等のコマンドも揃えられる
- (-) CLIツール自体のインストールが必要（brew / npm / バイナリ配布等）

### 3. GUIインストーラー

- (+) 最もとっつきやすい
- (-) 実装コストが高い。実験的プロジェクトのスコープを超える

## 決定

**`loopback start` 一発で全コンポーネントが立ち上がる体験を目指す。**

`loopback start` で Web UI・DB・MCPサーバーを含む全コンポーネントが立ち上がる。

- 配布は `npm (npx loopback)` → [ADR-0004](0004-architecture.md)
- ~~内部実装はDocker Composeをラップする~~ → **Dockerは不採用**。Node.jsプロセスをホストで直接起動する → [ADR-0004](0004-architecture.md)

## Dockerを採用しなかった理由

当初はランタイム依存の排除を目的としてDockerを前提としていた。しかし、技術スタックをTypeScript (Node.js) に決定した時点でNode.jsが前提条件となったため、Dockerによる環境分離のメリットが失われた。

また、Dockerボリュームによるデータ永続化はユーザーの意図しないデータ消失リスクを持つ。Node.jsプロセスをホストで直接起動することで、DBファイルを `~/.loopback/loopback.db` にシンプルに置ける。
