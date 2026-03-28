import type { Goal } from '../types'
import { Badge } from './Badge'

const typeLabel = { annual: '年間', quarterly: '四半期' } as const

type GoalCardProps = {
  goal: Goal
}

export function GoalCard({ goal }: GoalCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <Badge variant={goal.type} label={typeLabel[goal.type]} />
        <span className="card-date">
          {goal.start_date} 〜 {goal.end_date}
        </span>
      </div>
      <div className="card-content">{goal.content}</div>
    </div>
  )
}
