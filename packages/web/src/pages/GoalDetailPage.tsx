import { useState } from 'react'

import { Badge } from '../components/Badge'
import { GoalForm } from '../components/GoalForm'
import { useDelete } from '../hooks/useDelete'
import { useFetch } from '../hooks/useFetch'
import type { Goal } from '../types'

const typeLabel = { annual: '年間', quarterly: '四半期' } as const

type Props = {
  id: number
}

export function GoalDetailPage({ id }: Props) {
  const { data: goal, loading, error, refetch } = useFetch<Goal>(`/api/goals/${id}`)
  const [editing, setEditing] = useState(false)
  const { remove, deleting } = useDelete()

  if (loading) return <div className="loading">読み込み中...</div>
  if (error) return <div className="error">エラー: {error}</div>
  if (!goal) return <div className="error">目標が見つかりません</div>

  const handleDelete = async () => {
    if (!window.confirm('この目標を削除しますか？')) return
    try {
      await remove(`/api/goals/${id}`)
      window.location.hash = '#goals'
    } catch {
      // error is handled by useDelete
    }
  }

  if (editing) {
    return (
      <>
        <div className="detail-header">
          <a href="#goals" className="detail-back">
            ← 一覧に戻る
          </a>
          <h2 className="page-title">目標を編集</h2>
        </div>
        <GoalForm
          key={goal.id}
          initialGoal={goal}
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
        <a href="#goals" className="detail-back">
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
          <Badge variant={goal.type} label={typeLabel[goal.type]} />
          <span className="card-date">
            {goal.start_date} 〜 {goal.end_date}
          </span>
        </div>
        <div className="card-content">{goal.content}</div>
      </div>
    </>
  )
}
