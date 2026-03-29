import { useState } from 'react'

import { useSubmit } from '../hooks/useSubmit'
import type { Goal } from '../types'

type GoalInput = {
  type: 'annual' | 'quarterly'
  content: string
  start_date: string
  end_date: string
}

type Props = {
  onCreated: () => void
  onCancel: () => void
}

export function GoalForm({ onCreated, onCancel }: Props) {
  const [type, setType] = useState<'annual' | 'quarterly'>('quarterly')
  const [content, setContent] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { submit, submitting, error } = useSubmit<GoalInput, Goal>('/api/goals')

  const canSubmit = content.trim() && startDate && endDate && !submitting

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return

    try {
      await submit({ type, content: content.trim(), start_date: startDate, end_date: endDate })
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
          onChange={(e) => setType(e.target.value as 'annual' | 'quarterly')}
        >
          <option value="quarterly">四半期</option>
          <option value="annual">年間</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">内容</label>
        <textarea
          className="form-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="目標の内容を入力..."
        />
      </div>
      <div className="form-group">
        <label className="form-label">開始日</label>
        <input
          className="form-input"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">終了日</label>
        <input
          className="form-input"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
          {submitting ? '保存中...' : '保存'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </form>
  )
}
