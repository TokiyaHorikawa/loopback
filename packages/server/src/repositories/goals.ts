import { getDb, goals } from '@loopback/db'
import { and, desc, lte, gte } from 'drizzle-orm'

import type { GoalInput } from '../validators/goals.js'

export function findAllGoals() {
  const db = getDb()
  return db.select().from(goals).orderBy(desc(goals.id)).all()
}

export function findActiveGoals(today: string) {
  const db = getDb()
  return db
    .select()
    .from(goals)
    .where(and(lte(goals.start_date, today), gte(goals.end_date, today)))
    .all()
}

export function insertGoal(input: GoalInput) {
  const db = getDb()
  return db
    .insert(goals)
    .values({
      type: input.type as 'annual' | 'quarterly',
      content: input.content,
      start_date: input.start_date,
      end_date: input.end_date,
    })
    .returning()
    .get()
}
