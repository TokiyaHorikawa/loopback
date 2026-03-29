import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { DB_DIR, PID_PATH } from './constants.js'

interface PidInfo {
  pid: number
  port: number
}

export function writePidFile(pid: number, port: number): void {
  mkdirSync(DB_DIR, { recursive: true })
  const tmp = join(DB_DIR, 'loopback.pid.tmp')
  writeFileSync(tmp, JSON.stringify({ pid, port }))
  renameSync(tmp, PID_PATH)
}

export function readPidFile(): PidInfo | null {
  try {
    const data = readFileSync(PID_PATH, 'utf-8')
    return JSON.parse(data) as PidInfo
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export function removePidFile(): void {
  try {
    unlinkSync(PID_PATH)
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return
    }
    throw err
  }
}
