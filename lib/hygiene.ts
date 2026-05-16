import { Task } from './types'

// Extract @mentions from task text
// Product rationale: tracking mentions surfaces collaboration patterns,
// feeding the weekly retro's "who you rely on" insight.
export function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) || []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

export function getDayAge(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

export function isStale(task: Task, thresholdDays = 3): boolean {
  return !task.done && getDayAge(task.createdAt) >= thresholdDays
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// Safe local-date ISO string — avoids UTC offset shifting the date (e.g. UTC+3 midnight = prev day in UTC)
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function offsetLocalDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00') // parsed as local time
  d.setDate(d.getDate() + days)
  return localDateISO(d)
}

// Extract #tagname shortcuts from task text
export function extractTagShortcuts(text: string): string[] {
  const matches = text.match(/#(\w+)/g) || []
  return [...new Set(matches.map(m => m.slice(1)))]
}

// Strip @mentions and #tags from task text for clean display
export function cleanText(text: string): string {
  return text.replace(/@\w+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim()
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
