import { useFetch } from '../hooks/useFetch'
import type { ContextResponse } from '../types'

const REVIEW_INTERVAL_DAYS = 14
const DEADLINE_THRESHOLD_DAYS = 7

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

function deriveAction(ctx: ContextResponse): { message: string; href: string } | null {
  const today = new Date().toISOString().slice(0, 10)

  if (ctx.goals.length === 0) {
    return { message: 'まず目標を設定しましょう', href: '#goals' }
  }

  const hasApproachingDeadline = ctx.goals.some(
    (g) =>
      daysBetween(today, g.end_date) <= DEADLINE_THRESHOLD_DAYS &&
      daysBetween(today, g.end_date) >= 0,
  )
  if (hasApproachingDeadline) {
    return { message: '最終ふりかえりの時期です', href: '#reviews' }
  }

  const { last_reviewed_at } = ctx.review_stats
  if (!last_reviewed_at || daysBetween(last_reviewed_at, today) >= REVIEW_INTERVAL_DAYS) {
    return { message: '中間ふりかえりをしましょう', href: '#reviews' }
  }

  return null
}

export function NextAction() {
  const { data: ctx } = useFetch<ContextResponse>('/api/context')

  if (!ctx) return null

  const action = deriveAction(ctx)
  if (!action) return null

  return (
    <div className="next-action">
      {action.message}
      {'  '}
      <a className="next-action-link" href={action.href}>
        こちらから
      </a>
    </div>
  )
}
