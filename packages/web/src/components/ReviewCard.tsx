import type { Review } from '../types'
import { Badge } from './Badge'

const typeLabel = { interim: '中間', final: '最終' } as const

type ReviewCardProps = {
  review: Review
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <a href={`#reviews/${review.id}`} className="card card-link">
      <div className="card-header">
        <Badge variant={review.type} label={typeLabel[review.type]} />
        <span className="card-date">{review.date}</span>
      </div>
      <div className="card-content">{review.content}</div>
    </a>
  )
}
