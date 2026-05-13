import { DailyLog, Task } from './types'
import { localDateISO } from './hygiene'

const PREFIX = 'focus_engine_'
const LOG_KEY = `${PREFIX}logs`
const SETTINGS_KEY = `${PREFIX}settings`

function today(): string {
  return localDateISO()
}

export function getLogs(): Record<string, DailyLog> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveLogs(logs: Record<string, DailyLog>): void {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs))
}

export function getTodayLog(): DailyLog {
  return getLogByDate(today())
}

export function saveTodayLog(log: DailyLog): void {
  saveLogByDate(log)
}

export function getLogByDate(date: string): DailyLog {
  const logs = getLogs()
  if (!logs[date]) {
    logs[date] = { date, tasks: [], note: '' }
    saveLogs(logs)
  }
  return logs[date]
}

export function saveLogByDate(log: DailyLog): void {
  const logs = getLogs()
  logs[log.date] = log
  saveLogs(logs)
}

// Returns which dates have at least one task or a non-empty note
export function getActiveDates(): Set<string> {
  const logs = getLogs()
  const active = new Set<string>()
  for (const [date, log] of Object.entries(logs)) {
    if (log.tasks.length > 0 || log.note.trim()) active.add(date)
  }
  return active
}

// Returns logs from the past 7 days (excluding today) for retro analysis
export function getWeekLogs(): DailyLog[] {
  const logs = getLogs()
  const result: DailyLog[] = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = localDateISO(d)
    if (logs[key]) result.push(logs[key])
  }
  return result
}

// Returns ALL undone tasks older than `days` across all logs
// Product rationale: stale tasks represent decision debt — surfacing them forces
// the user to consciously keep, finish, or drop them rather than letting them
// silently accumulate and erode confidence.
export function getStaleTasks(days = 3): Task[] {
  const logs = getLogs()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const stale: Task[] = []

  for (const log of Object.values(logs)) {
    for (const task of log.tasks) {
      if (!task.done && new Date(task.createdAt) < cutoff) {
        stale.push(task)
      }
    }
  }
  return stale
}

export function updateTaskAcrossLogs(taskId: string, updater: (t: Task) => Task | null): void {
  const logs = getLogs()
  for (const log of Object.values(logs)) {
    const idx = log.tasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      const result = updater(log.tasks[idx])
      if (result === null) {
        log.tasks.splice(idx, 1)
      } else {
        log.tasks[idx] = result
      }
    }
  }
  saveLogs(logs)
}

// Count of starred tasks across every date — used for the header badge
export function getGlobalStarredCount(): number {
  const logs = getLogs()
  let count = 0
  for (const log of Object.values(logs))
    for (const task of log.tasks)
      if (task.starred) count++
  return count
}

export type StarredTask = Task & { logDate: string }

// Returns all starred tasks across all logs, each tagged with the date of the log they belong to.
// Sorted newest log-date first, then by createdAt within the same date.
export function getStarredTasks(): StarredTask[] {
  const logs = getLogs()
  const starred: StarredTask[] = []
  for (const log of Object.values(logs)) {
    for (const task of log.tasks) {
      if (task.starred) {
        starred.push({ ...task, tags: task.tags ?? [], logDate: log.date })
      }
    }
  }
  return starred.sort((a, b) => {
    const dateDiff = b.logDate.localeCompare(a.logDate)
    if (dateDiff !== 0) return dateDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function getApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(`${SETTINGS_KEY}_apikey`) || ''
}

export function saveApiKey(key: string): void {
  localStorage.setItem(`${SETTINGS_KEY}_apikey`, key)
}
