import { useState } from 'react'

import { Badge } from '../components/Badge'
import { ReviewForm } from '../components/ReviewForm'
import { useDelete } from '../hooks/useDelete'
import { useFetch } from '../hooks/useFetch'
import type { Review } from '../types'

const typeLabel = { interim: '中間', final: '最終' } as const

type Props = {
  id: number
}

export function ReviewDetailPage({ id }: Props) {
  const { data: review, loading, error, refetch } = useFetch<Review>(`/api/reviews/${id}`)
  const [editing, setEditing] = useState(false)
  const { remove, deleting } = useDelete()

  if (loading) return <div className="loading">読み込み中...</div>
  if (error) return <div className="error">エラー: {error}</div>
  if (!review) return <div className="error">振り返りが見つかりません</div>

  const handleDelete = async () => {
    if (!window.confirm('この振り返りを削除しますか？')) return
    try {
      await remove(`/api/reviews/${id}`)
      window.location.hash = '#reviews'
    } catch {
      // error is handled by useDelete
    }
  }

  if (editing) {
    return (
      <>
        <div className="detail-header">
          <a href="#reviews" className="detail-back">
            ← 一覧に戻る
          </a>
          <h2 className="page-title">振り返りを編集</h2>
        </div>
        <ReviewForm
          key={review.id}
          initialReview={review}
          onCreated={() => {
            setEditing(false)
            refetch()
          }}
          onCancel={() => setEditing(false)}
        />
      </>
    )
  }

  return (
    <>
      <div className="detail-header">
        <a href="#reviews" className="detail-back">
          ← 一覧に戻る
        </a>
        <div className="card-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            編集
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <Badge variant={review.type} label={typeLabel[review.type]} />
          <span className="card-date">{review.date}</span>
        </div>
        <div className="card-content">{review.content}</div>
      </div>
    </>
  )
}
