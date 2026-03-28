import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { getContext } from './services/context.js'
import { createGoal } from './services/goals.js'
import {
  createReview,
  getRecentReviews,
  getReviewsByGoalId,
  searchReviews,
} from './services/reviews.js'
import { validateGoalInput } from './validators/goals.js'
import {
  validateFindReviewsInput,
  validateListReviewsInput,
  validateReviewInput,
} from './validators/reviews.js'

export const mcpServer = new McpServer({
  name: 'loopback',
  version: '0.0.1',
})

mcpServer.registerTool(
  'get_context',
  {
    description: 'アクティブな目標 + レビュー統計 + 直近5件を返す',
  },
  () => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      content: [{ type: 'text', text: JSON.stringify(getContext(today)) }],
    }
  },
)

mcpServer.registerTool(
  'create_goal',
  {
    description: 'type, content, start_date, end_date で目標を保存する',
    inputSchema: {
      type: z.enum(['annual', 'quarterly']),
      content: z.string(),
      start_date: z.string(),
      end_date: z.string(),
    },
  },
  ({ type, content, start_date, end_date }) => {
    const validated = validateGoalInput({ type, content, start_date, end_date })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const goal = createGoal(validated.data)
    return {
      content: [{ type: 'text', text: JSON.stringify(goal) }],
    }
  },
)

mcpServer.registerTool(
  'save_review',
  {
    description: 'type, content, date, goal_ids? でふりかえりを保存する',
    inputSchema: {
      type: z.enum(['interim', 'final']),
      content: z.string(),
      date: z.string(),
      goal_ids: z.array(z.number()).optional(),
    },
  },
  ({ type, content, date, goal_ids }) => {
    const validated = validateReviewInput({ type, content, date, goal_ids })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const review = createReview(validated.data)
    return {
      content: [{ type: 'text', text: JSON.stringify(review) }],
    }
  },
)

mcpServer.registerTool(
  'list_reviews',
  {
    description: 'limit, goal_id? でレビュー履歴を取得する',
    inputSchema: {
      limit: z.number(),
      goal_id: z.number().optional(),
    },
  },
  ({ limit, goal_id }) => {
    const validated = validateListReviewsInput({ limit, goal_id })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const reviews = validated.data.goal_id
      ? getReviewsByGoalId(validated.data.goal_id, validated.data.limit)
      : getRecentReviews(validated.data.limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(reviews) }],
    }
  },
)

mcpServer.registerTool(
  'find_reviews',
  {
    description: 'limit, query?, from?, to?, type? で横断的にふりかえりを検索する',
    inputSchema: {
      limit: z.number(),
      query: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      type: z.enum(['interim', 'final']).optional(),
    },
  },
  ({ limit, query, from, to, type }) => {
    const validated = validateFindReviewsInput({ limit, query, from, to, type })
    if ('error' in validated) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: validated.error }) }],
        isError: true,
      }
    }
    const reviews = searchReviews(validated.data)
    return {
      content: [{ type: 'text', text: JSON.stringify(reviews) }],
    }
  },
)

mcpServer.registerPrompt(
  'review',
  {
    title: '中間ふりかえり',
    description: 'Claudeが中間ふりかえりセッションを進行するためのプロンプト',
  },
  () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `あなたはふりかえりの伴走者です。ユーザーの中間ふりかえりを対話的に進行してください。

## 進め方

1. まず get_context を呼び、現在の目標・直近のふりかえり・統計を確認してください
2. 状況に応じて最初の問いかけを変えてください：
   - 目標が未設定 → 「まず目標を設定しましょうか？」と提案する
   - 初回のふりかえり → 「はじめてのふりかえりですね。最近どうですか？」
   - 継続中 → 「前回から○日ですね。今どんな状況ですか？」
3. 以下の3つを自然な対話で引き出してください：
   - 進捗：目標に対して今どこにいるか
   - 気づき：最近感じていること、学んだこと
   - ブロッカー：詰まっていること、困っていること
4. 深掘りが必要なら find_reviews で過去のふりかえりを参照してください
5. 対話が十分にできたら、内容をまとめて save_review(type: "interim") で保存してください

## トーンと姿勢

- 穏やかで、押しつけがましくない
- ユーザーの言葉を受け止めてから次の問いを出す
- 「正解」を求めず、気づきを引き出すことを重視する
- 日本語で会話する`,
        },
      },
    ],
  }),
)

mcpServer.registerPrompt(
  'review_final',
  {
    title: '最終ふりかえり',
    description: 'Claudeが最終ふりかえりセッションを進行するためのプロンプト',
  },
  () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `あなたはふりかえりの伴走者です。ユーザーの最終ふりかえり（目標期間の締めくくり）を対話的に進行してください。

## 進め方

1. まず get_context を呼び、アクティブな目標一覧を確認してください
2. ユーザーに「どの目標についてふりかえりますか？」と対象の目標を選んでもらってください
3. list_reviews(goal_id, limit: 20) で対象目標に紐づく中間ふりかえりを取得してください
4. 中間ふりかえりの流れを踏まえ、以下を対話で引き出してください：
   - 達成度：目標に対してどこまでできたか
   - 振り返り：期間を通じてどうだったか、何が起きたか
   - 学び：次に活かせることは何か
5. 対話が十分にできたら、内容をまとめて save_review(type: "final", goal_ids: [選んだgoalのid]) で保存してください

## トーンと姿勢

- 穏やかで、評価的にならない
- 達成できなかったことも責めず、そこから何を学べるかに焦点を当てる
- ユーザー自身の言葉で振り返ることを大切にする
- 日本語で会話する`,
        },
      },
    ],
  }),
)

mcpServer.registerPrompt(
  'set_goal',
  {
    title: '目標設定',
    description: 'Claudeが目標設定を対話的にサポートするためのプロンプト',
  },
  () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `あなたはふりかえりの伴走者です。ユーザーの目標設定を対話的にサポートしてください。

## 進め方

1. まず get_context を呼び、現在の目標状況を確認してください
2. find_reviews(type: "final", limit: 5) で過去の最終ふりかえりを参照してください（あれば）
3. 過去の学びがあれば「前回こんな学びがありましたね」と共有してください
4. ユーザーに目標テキストを貼り付けてもらってください（会社のツールからのコピペでOK）
5. 以下を確認してください：
   - type：年間目標 (annual) か四半期目標 (quarterly) か
   - start_date：開始日（YYYY-MM-DD形式）
   - end_date：終了日（YYYY-MM-DD形式）
6. 確認ができたら create_goal で保存してください

## トーンと姿勢

- 手軽さを重視する。目標の構造化や深掘りは求めない
- 「コピペで大丈夫ですよ」という姿勢
- 日本語で会話する`,
        },
      },
    ],
  }),
)
