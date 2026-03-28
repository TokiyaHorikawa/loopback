import { serve } from '@hono/node-server'

import { app } from './app.js'

export interface StartServerOptions {
  port?: number
  silent?: boolean
}

export function startServer(options: StartServerOptions = {}) {
  const port = options.port ?? 3000
  return serve({ fetch: app.fetch, port }, (info) => {
    if (!options.silent) {
      console.log(`Server listening on http://localhost:${info.port}`)
    }
  })
}

// 直接実行時はデフォルト設定で起動
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('/server/src/index.ts') ||
    process.argv[1].endsWith('/server/dist/index.js'))

if (isDirectRun) {
  startServer()
}
