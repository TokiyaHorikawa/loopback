import { useState } from 'react'

import { useFetch } from '../hooks/useFetch'
import { useSubmit } from '../hooks/useSubmit'
import type { Goal, Review } from '../types'

type ReviewInput = {
  type: 'interim' | 'final'
  content: string
  date: string
  goal_ids: number[]
}

type Props = {
  onCreated: () => void
  onCancel: () => void
  initialReview?: Review
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function ReviewForm({ onCreated, onCancel, initialReview }: Props) {
  const [type, setType] = useState<'interim' | 'final'>(initialReview?.type ?? 'interim')
  const [content, setContent] = useState(initialReview?.content ?? '')
  const [date, setDate] = useState(initialReview?.date ?? today())
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[]>(initialReview?.goal_ids ?? [])

  const url = initialReview ? `/api/reviews/${initialReview.id}` : '/api/reviews'
  const method = initialReview ? 'PUT' : 'POST'
  const { submit, submitting, error } = useSubmit<ReviewInput, Review>(url, method)
  const { data: goals } = useFetch<Goal[]>('/api/goals')

  const isFinal = type === 'final'
  const goalIdsValid = isFinal ? selectedGoalIds.length === 1 : true
  const canSubmit = content.trim() && date && goalIdsValid && !submitting

  const toggleGoalId = (id: number) => {
    setSelectedGoalIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return

    try {
      await submit({ type, content: content.trim(), date, goal_ids: selectedGoalIds })
      onCreated()
    } catch {
      // error is handled by useSubmit
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">タイプ</label>
        <select
          className="form-select"
          value={type}
          onChange={(e) => setType(e.target.value as 'interim' | 'final')}
        >
          <option value="interim">中間</option>
          <option value="final">最終</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">内容</label>
        <textarea
          className="form-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="ふりかえりの内容を入力..."
        />
      </div>
      <div className="form-group">
        <label className="form-label">日付</label>
        <input
          className="form-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {goals && goals.length > 0 && (
        <div className="form-group">
          <label className="form-label">紐づける目標{isFinal ? '（1つ選択）' : '（任意）'}</label>
          <div className="goal-checklist">
            {goals.map((goal) => (
              <label key={goal.id}>
                <input
                  type="checkbox"
                  checked={selectedGoalIds.includes(goal.id)}
                  onChange={() => toggleGoalId(goal.id)}
                />
                {goal.content}
              </label>
            ))}
          </div>
          {isFinal && selectedGoalIds.length !== 1 && (
            <div className="form-error">最終ふりかえりには目標を1つ選択してください</div>
          )}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
          {submitting ? '保存中...' : initialReview ? '更新' : '保存'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </form>
  )
}
