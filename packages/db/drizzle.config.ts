import { homedir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: join(homedir(), '.loopback', 'loopback.db'),
  },
})
