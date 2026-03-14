# ADR-0005: MCP設計（ツールとプロンプト）

- **ステータス**: 承認
- **日付**: 2026-03-14

---

## コンテキスト

MCPツールはデータの読み書き手段にすぎない。Claudeがふりかえりをどう進行するかの型がなければ、毎回ばらばらな体験になる。

MCPプロトコルはツールとは別に **Prompts** リソースを提供できる。ツール設計とプロンプト設計をひとつのADRに集め、MCP設計の関心を一箇所に集中させる。

---

## ツール

### `get_context` の返却スキーマ

```ts
{
  goals: Goal[]             // アクティブな目標一覧（空 = 未設定）
  review_stats: {
    total: number           // 累計ふりかえり回数
    last_reviewed_at: string | null  // 最終ふりかえり日
  }
  recent_reviews: Review[]  // 直近5件
}
```

Claudeはこの情報から現在の状態を判断して最初の問いかけを決める。詳細が必要なら `list_reviews` / `find_reviews` を呼ぶ。

### ツール一覧

| ツール名 | 引数 | 用途 |
|---|---|---|
| `get_context` | なし | ふりかえり開始時にClaudeが最初に呼ぶ。アクティブな目標一覧 + 直近ふりかえり一覧を返す |
| `list_reviews` | `limit`(必須), `goal_id?` | 目標に紐づく履歴を取得。最終ふりかえり前に呼ぶ |
| `find_reviews` | `limit`(必須), `query?`, `from?`, `to?`, `type?` | 横断的にふりかえりを検索。キーワード・期間・種別で絞れる |
| `create_goal` | `type`, `content`, `start_date`, `end_date` | 目標のコピペ登録 |
| `save_review` | `type`, `content`, `date`, `goal_ids?` | ふりかえり完了後の記録 |

---

## プロンプト

### `review`（中間ふりかえり）

```
1. get_context を呼ぶ
2. 状況に応じて入り口を変える
   - 目標未設定 → 「まず目標を設定しましょうか」
   - 初回      → 「はじめてですね。最近どうですか」
   - 継続中    → 「前回から〇日ですね。今どこにいますか」
3. 進捗・気づき・詰まっていることを引き出す
4. 必要なら find_reviews で過去を参照
5. save_review(type: 中間, goal_ids?: [...])
```

### `review_final`（最終ふりかえり）

```
1. get_context を呼ぶ
2. アクティブな目標から対象を選んでもらう
3. list_reviews(goal_id, limit) で中間ふりかえりを取得
4. 「どうだったか・達成できたか」を振り返る
5. 「次に何を活かすか」を引き出す
6. save_review(type: 最終, goal_ids: [goal_id])
```

### `set_goal`（目標設定）

```
1. get_context を呼ぶ
2. find_reviews で過去の最終ふりかえりを参照（あれば）
3. 目標テキストをコピペしてもらう
4. type / start_date / end_date を確認
5. create_goal で保存
```

---

## 根拠

- **`get_context` を1ツールに集約** — Claudeがふりかえり開始時に迷わないよう、目標・直近レビューを一括返却する
- **`list_reviews(limit, goal_id?)` を追加** — 最終ふりかえりでは特定目標のレビュー履歴が必要。`get_context` の「直近」では足りない
- **`find_reviews` を追加** — ログが溜まるほど活きる横断検索。`limit` 必須でトークン量をClaudeが制御する
- **体験の型をサーバー側に持つ** — ユーザーがCLAUDE.mdを書かなくても、Loopbackをつなぐだけでふりかえりの型が使える
- **`update_goal` 等は後回し** — MVPで検証してから追加する
- **プロンプトの詳細な文言は実装時に詰める**
