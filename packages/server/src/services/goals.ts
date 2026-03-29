import * as repo from '../repositories/goals.js'
import type { GoalInput } from '../validators/goals.js'

export function listGoals() {
  return repo.findAllGoals()
}

export function getActiveGoals(today: string) {
  return repo.findActiveGoals(today)
}

export function getGoal(id: number) {
  return repo.findGoalById(id) ?? null
}

export function createGoal(input: GoalInput) {
  return repo.insertGoal(input)
}

export function updateGoal(id: number, input: GoalInput) {
  const existing = repo.findGoalById(id)
  if (!existing) return null
  return repo.updateGoal(id, input)
}

export function deleteGoal(id: number) {
  const existing = repo.findGoalById(id)
  if (!existing) return null
  return repo.deleteGoal(id)
}
