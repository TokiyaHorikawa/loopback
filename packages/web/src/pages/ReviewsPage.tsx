import { ReviewCard } from '../components/ReviewCard'
import { useFetch } from '../hooks/useFetch'
import type { Review } from '../types'

export function ReviewsPage() {
  const { data: reviews, loading, error } = useFetch<Review[]>('/api/reviews')

  if (loading) return <div className="loading">読み込み中...</div>
  if (error) return <div className="error">エラー: {error}</div>
  if (!reviews || reviews.length === 0)
    return <div className="empty">ふりかえりがまだありません</div>

  return (
    <>
      <h2 className="page-title">ふりかえり一覧</h2>
      <div className="card-list">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </>
  )
}
