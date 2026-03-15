import { sql } from 'drizzle-orm'
import { int, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const goals = sqliteTable('goals', {
  id: int('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['annual', 'quarterly'] }).notNull(),
  content: text('content').notNull(),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const reviews = sqliteTable('reviews', {
  id: int('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['interim', 'final'] }).notNull(),
  content: text('content').notNull(),
  date: text('date').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const review_goals = sqliteTable(
  'review_goals',
  {
    review_id: int('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    goal_id: int('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.review_id, table.goal_id] })],
)
