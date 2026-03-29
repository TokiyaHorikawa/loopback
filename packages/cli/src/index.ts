#!/usr/bin/env node

import { parseArgs } from 'node:util'

import { DB_PATH, migrate } from '@loopback/db'
import { runStdio, startServer } from '@loopback/server'
import open from 'open'

const VERSION = '0.0.1'

const HELP = `Loopback v${VERSION}
セルフマネジメントツール — 目標設定とふりかえりのループを回す

Usage: loopback <command> [options]

Commands:
  start   サーバーを起動する
  mcp     stdioモードでMCPサーバーを起動する

Options:
  --help     ヘルプを表示
  --version  バージョンを表示`

const MCP_HELP = `Usage: loopback mcp

stdioモードでMCPサーバーを起動する。
Claude Code / Claude Desktop が自動でプロセスを管理するため、手動起動は不要。

登録例:
  claude mcp add loopback -- npx loopback mcp`

const START_HELP = `Usage: loopback start [options]

サーバーを起動し、Web UI・REST API・MCPエンドポイントを提供する。

Options:
  --port <number>  ポート番号 (デフォルト: 3000)
  --no-open        ブラウザを自動で開かない
  --help           ヘルプを表示`

function main() {
  const args = process.argv.slice(2)

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION)
    return
  }

  const command = args.find((a) => !a.startsWith('-'))

  if (!command || args.includes('--help') || args.includes('-h')) {
    if (command === 'start') {
      console.log(START_HELP)
    } else if (command === 'mcp') {
      console.log(MCP_HELP)
    } else {
      console.log(HELP)
    }
    return
  }

  if (command === 'start') {
    start()
  } else if (command === 'mcp') {
    mcp()
  } else {
    console.error(`Unknown command: ${command}`)
    console.log(HELP)
    process.exitCode = 1
  }
}

function start() {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      port: { type: 'string', short: 'p' },
      open: { type: 'boolean', default: true },
    },
    strict: false,
    allowNegative: true,
  })

  const port = values.port ? Number(values.port) : 3000
  const shouldOpen = values.open !== false

  if (values.port && (Number.isNaN(port) || port < 1 || port > 65535)) {
    console.error(`Invalid port: ${values.port}`)
    process.exitCode = 1
    return
  }

  console.log(`\nLoopback v${VERSION}\n`)

  // DB マイグレーション
  migrate()
  console.log(`  Database:  ${DB_PATH}`)

  // サーバー起動
  const url = `http://localhost:${port}`
  startServer({ port, silent: true })
  console.log(`  Server:    ${url}`)
  console.log(`  MCP:       ${url}/mcp\n`)

  if (shouldOpen) {
    open(url)
  }
}

function mcp() {
  migrate()
  runStdio()
}

main()
