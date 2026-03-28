import { GoalCard } from '../components/GoalCard'
import { useFetch } from '../hooks/useFetch'
import type { Goal } from '../types'

export function GoalsPage() {
  const { data: goals, loading, error } = useFetch<Goal[]>('/api/goals')

  if (loading) return <div className="loading">読み込み中...</div>
  if (error) return <div className="error">エラー: {error}</div>
  if (!goals || goals.length === 0) return <div className="empty">目標がまだありません</div>

  return (
    <>
      <h2 className="page-title">目標一覧</h2>
      <div className="card-list">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </>
  )
}
