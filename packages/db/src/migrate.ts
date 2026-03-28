import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator'

import { DB_DIR, DB_PATH } from './constants.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function migrate() {
  mkdirSync(DB_DIR, { recursive: true })
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite)
  const migrationsFolder = join(__dirname, '../drizzle')

  try {
    drizzleMigrate(db, { migrationsFolder })
  } catch (err) {
    // drizzle-kit migrate で作成された既存 DB ではハッシュ不整合で
    // テーブル再作成を試みて失敗する。テーブルが既に存在するなら問題なし。
    const isTableExists =
      err instanceof Error &&
      'cause' in err &&
      err.cause instanceof Error &&
      err.cause.message?.includes('already exists')

    if (!isTableExists) throw err
  }

  sqlite.close()
}
