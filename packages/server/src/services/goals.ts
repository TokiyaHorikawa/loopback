import * as repo from '../repositories/goals.js'
import type { GoalInput } from '../validators/goals.js'

export function listGoals() {
  return repo.findAllGoals()
}

export function getActiveGoals(today: string) {
  return repo.findActiveGoals(today)
}

export function createGoal(input: GoalInput) {
  return repo.insertGoal(input)
}
