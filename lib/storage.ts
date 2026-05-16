import { createClient } from './supabase'
import { DailyLog, Task } from './types'
import { localDateISO } from './hygiene'

export type StarredTask = Task & { logDate: string }

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Not authenticated')
  return session.user.id
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: any): Task {
  return {
    id: row.id,
    text: row.text,
    done: row.done,
    doneAt: row.done_at ?? undefined,
    createdAt: row.created_at,
    starred: row.starred,
    tags: row.tags ?? [],
    mentions: row.mentions ?? [],
  }
}

// ─── Log CRUD ────────────────────────────────────────────────────────────────

export async function getLogByDate(date: string): Promise<DailyLog> {
  const supabase = createClient()
  const userId = await getUserId()

  // Get or create the daily log row
  let { data: log } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (!log) {
    const { data: created } = await supabase
      .from('daily_logs')
      .insert({ user_id: userId, date, note: '' })
      .select()
      .single()
    log = created
  }

  if (!log) return { date, tasks: [], note: '' }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('log_id', log.id)
    .order('created_at', { ascending: false })

  return {
    date,
    note: log.note ?? '',
    tasks: (tasks ?? []).map(rowToTask),
  }
}

export async function saveLogByDate(log: DailyLog): Promise<void> {
  const supabase = createClient()
  const userId = await getUserId()

  // Upsert the log (get or create, update note)
  const { data: logRow } = await supabase
    .from('daily_logs')
    .upsert(
      { user_id: userId, date: log.date, note: log.note },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (!logRow) return

  // Delete tasks that were removed
  const currentIds = log.tasks.map(t => t.id)
  if (currentIds.length > 0) {
    await supabase
      .from('tasks')
      .delete()
      .eq('log_id', logRow.id)
      .not('id', 'in', `(${currentIds.map(id => `'${id}'`).join(',')})`)
  } else {
    await supabase.from('tasks').delete().eq('log_id', logRow.id)
  }

  // Upsert all current tasks
  if (log.tasks.length > 0) {
    await supabase.from('tasks').upsert(
      log.tasks.map(t => ({
        id: t.id,
        user_id: userId,
        log_id: logRow.id,
        log_date: log.date,
        text: t.text,
        done: t.done,
        done_at: t.doneAt ?? null,
        created_at: t.createdAt,
        starred: t.starred,
        tags: t.tags ?? [],
        mentions: t.mentions ?? [],
      }))
    )
  }
}

// ─── Cross-log operations ─────────────────────────────────────────────────────

export async function updateTaskAcrossLogs(
  taskId: string,
  updater: (t: Task) => Task | null
): Promise<void> {
  const supabase = createClient()

  const { data: row } = await supabase
    .from('tasks').select('*').eq('id', taskId).maybeSingle()

  if (!row) return

  const updated = updater(rowToTask(row))

  if (updated === null) {
    await supabase.from('tasks').delete().eq('id', taskId)
  } else {
    await supabase.from('tasks').update({
      text: updated.text,
      done: updated.done,
      done_at: updated.doneAt ?? null,
      created_at: updated.createdAt,
      starred: updated.starred,
      tags: updated.tags ?? [],
      mentions: updated.mentions ?? [],
    }).eq('id', taskId)
  }
}

// ─── Stale tasks ──────────────────────────────────────────────────────────────

export async function getStaleTasks(days = 3): Promise<Task[]> {
  const supabase = createClient()
  const userId = await getUserId()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('done', false)
    .lt('created_at', cutoff.toISOString())

  return (data ?? []).map(rowToTask)
}

// ─── Active dates (calendar dots) ────────────────────────────────────────────

export async function getActiveDates(): Promise<Set<string>> {
  const supabase = createClient()
  const userId = await getUserId()

  const { data } = await supabase
    .from('daily_logs')
    .select('date, tasks(id), note')
    .eq('user_id', userId)

  const active = new Set<string>()
  for (const row of data ?? []) {
    const hasTasks = Array.isArray(row.tasks) && row.tasks.length > 0
    const hasNote = typeof row.note === 'string' && row.note.trim().length > 0
    if (hasTasks || hasNote) active.add(row.date)
  }
  return active
}

// ─── Weekly logs (Monday → today) ────────────────────────────────────────────

export async function getWeekLogs(): Promise<DailyLog[]> {
  const supabase = createClient()
  const userId = await getUserId()

  const dayOfWeek = new Date().getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const dates: string[] = []
  for (let i = daysFromMonday; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(localDateISO(d))
  }

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*, tasks(*)')
    .eq('user_id', userId)
    .in('date', dates)

  return dates.map(date => {
    const log = logs?.find(l => l.date === date)
    return {
      date,
      note: log?.note ?? '',
      tasks: (log?.tasks ?? []).map(rowToTask),
    }
  })
}

// ─── Starred tasks ────────────────────────────────────────────────────────────

export async function getStarredTasks(): Promise<StarredTask[]> {
  const supabase = createClient()
  const userId = await getUserId()

  const { data } = await supabase
    .from('tasks')
    .select('*, daily_logs(date)')
    .eq('user_id', userId)
    .eq('starred', true)
    .order('created_at', { ascending: false })

  return (data ?? []).map(row => ({
    ...rowToTask(row),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logDate: (row.daily_logs as any)?.date ?? '',
  }))
}

export async function getGlobalStarredCount(): Promise<number> {
  const supabase = createClient()
  const userId = await getUserId()

  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('starred', true)

  return count ?? 0
}

// ─── Settings (stays in localStorage — user preference, not user data) ────────

export function getApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('focus_engine_settings_apikey') || ''
}

export function saveApiKey(key: string): void {
  localStorage.setItem('focus_engine_settings_apikey', key)
}
