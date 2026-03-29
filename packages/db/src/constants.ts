import { homedir } from 'node:os'
import { join } from 'node:path'

export const DB_DIR = join(homedir(), '.loopback')
export const DB_PATH = join(DB_DIR, 'loopback.db')
export const PID_PATH = join(DB_DIR, 'loopback.pid')
