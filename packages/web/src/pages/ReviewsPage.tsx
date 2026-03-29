import { useState } from 'react'

import { ReviewCard } from '../components/ReviewCard'
import { ReviewForm } from '../components/ReviewForm'
import { useFetch } from '../hooks/useFetch'
import type { Review } from '../types'

export function ReviewsPage() {
  const { data: reviews, loading, error, refetch } = useFetch<Review[]>('/api/reviews')
  const [showForm, setShowForm] = useState(false)

  if (loading) return <div className="loading">読み込み中...</div>
  if (error) return <div className="error">エラー: {error}</div>

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">ふりかえり一覧</h2>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            ふりかえりを追加
          </button>
        )}
      </div>
      {showForm && (
        <ReviewForm
          onCreated={() => {
            setShowForm(false)
            refetch()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {!reviews || reviews.length === 0 ? (
        <div className="empty">ふりかえりがまだありません</div>
      ) : (
        <div className="card-list">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </>
  )
}
