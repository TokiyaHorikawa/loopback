import { useState } from 'react'

import { GoalCard } from '../components/GoalCard'
import { GoalForm } from '../components/GoalForm'
import { useFetch } from '../hooks/useFetch'
import type { Goal } from '../types'

export function GoalsPage() {
  const { data: goals, loading, error, refetch } = useFetch<Goal[]>('/api/goals')
  const [showForm, setShowForm] = useState(false)

  if (loading) return <div className="loading">読み込み中...</div>
  if (error) return <div className="error">エラー: {error}</div>

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">目標一覧</h2>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            目標を追加
          </button>
        )}
      </div>
      {showForm && (
        <GoalForm
          onCreated={() => {
            setShowForm(false)
            refetch()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {!goals || goals.length === 0 ? (
        <div className="empty">目標がまだありません</div>
      ) : (
        <div className="card-list">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </>
  )
}
