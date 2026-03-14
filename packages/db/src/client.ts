import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

const dbDir = join(homedir(), '.loopback')
mkdirSync(dbDir, { recursive: true })

const sqlite = new Database(join(dbDir, 'loopback.db'))

export const db = drizzle(sqlite, { schema })
