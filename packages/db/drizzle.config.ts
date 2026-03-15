import { homedir } from 'node:os'
import { join } from 'node:path'

import { defineConfig } from 'drizzle-kit'

const DB_PATH = join(homedir(), '.loopback', 'loopback.db')

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: DB_PATH,
  },
})
