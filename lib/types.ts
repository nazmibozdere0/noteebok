export interface Task {
  id: string
  text: string
  done: boolean
  createdAt: string
  doneAt?: string
  mentions: string[]
  tags: string[]
  starred: boolean
}

export interface DailyLog {
  date: string
  tasks: Task[]
  note: string
}

export interface PurgeCandidate {
  task: Task
  ageInDays: number
}

export type PurgeAction = 'keep' | 'done' | 'discard'

export interface RetroReport {
  stuckAreas: string[]
  collaborators: { name: string; frequency: number }[]
  focusRecommendations: string[]
  summary: string
  completionRate: number
}
