'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import LoginPage from '@/components/LoginPage'
import Header, { Tab } from '@/components/Header'
import TaskInput from '@/components/TaskInput'
import TaskList from '@/components/TaskList'
import NotesScratchpad from '@/components/NotesScratchpad'
import PurgeModal from '@/components/PurgeModal'
import RetroModal from '@/components/RetroModal'
import SettingsModal from '@/components/SettingsModal'
import StarredView from '@/components/StarredView'
import CalendarPopover from '@/components/CalendarPopover'
import { Task, DailyLog, RetroReport } from '@/lib/types'
import { generateId, extractMentions, localDateISO, offsetLocalDate } from '@/lib/hygiene'
import {
  getLogByDate,
  saveLogByDate,
  getStaleTasks,
  updateTaskAcrossLogs,
  getWeekLogs,
  getApiKey,
  getGlobalStarredCount,
} from '@/lib/storage'
import { generateRetro } from '@/lib/ai'

function todayISO(): string { return localDateISO() }

const LOG_CACHE_KEY = 'nb_log_cache'
const LAST_DATE_KEY = 'nb_last_date'
const USER_KEY = 'nb_user'
const CACHE_WINDOW = 15 // days before/after today to keep

function readLogCache(): Map<string, DailyLog> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = localStorage.getItem(LOG_CACHE_KEY)
    if (!raw) return new Map()
    return new Map(JSON.parse(raw) as [string, DailyLog][])
  } catch { return new Map() }
}

function persistLogCache(cache: Map<string, DailyLog>, updatedDate: string, log: DailyLog) {
  cache.set(updatedDate, log)
  try {
    const today = localDateISO()
    const min = offsetLocalDate(today, -CACHE_WINDOW)
    const max = offsetLocalDate(today, CACHE_WINDOW)
    const entries = Array.from(cache.entries())
      .filter(([d]) => d >= min && d <= max)
      .sort(([a], [b]) => b.localeCompare(a))
    localStorage.setItem(LOG_CACHE_KEY, JSON.stringify(entries))
  } catch { /* storage full — ignore */ }
}

function readLastDate(): string {
  if (typeof window === 'undefined') return localDateISO()
  return localStorage.getItem(LAST_DATE_KEY) ?? localDateISO()
}

function saveLastDate(date: string) {
  try { localStorage.setItem(LAST_DATE_KEY, date) } catch { /* ignore */ }
}

function formatHeaderDate(iso: string): { day: string; date: string } {
  const d = new Date(iso + 'T00:00:00')
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'long' }),
    date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
  }
}

function getSubtitle(viewedDate: string, today: string): string {
  const diff = Math.round(
    (new Date(viewedDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000
  )
  if (diff === 0) return 'Clean slate. Ship something worth it.'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow — plan ahead'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  return `${diff} days ahead`
}

export default function Root() {
  const [session, setSession] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function upsertProfile(s: import('@supabase/supabase-js').Session | null) {
      if (!s) return
      await supabase.from('user_profiles').upsert(
        { id: s.user.id, email: s.user.email ?? '', last_sign_in_at: new Date().toISOString() },
        { onConflict: 'id', ignoreDuplicates: false }
      )
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session)
      upsertProfile(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(!!s)
      if (_e === 'SIGNED_IN') upsertProfile(s)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === null) return null
  if (!session) return <LoginPage />
  return <Dashboard />
}

function Dashboard() {
  const [today] = useState(todayISO)
  const [viewedDate, setViewedDate] = useState(() => readLastDate())
  const [activeTab, setActiveTab] = useState<Tab>('daily')
  const cache = useRef<Map<string, DailyLog>>(readLogCache())
  const [log, setLog] = useState<DailyLog>(() => {
    const initial = readLastDate()
    return cache.current.get(initial) ?? { date: initial, tasks: [], note: '' }
  })
  const [logLoading, setLogLoading] = useState(() => !cache.current.has(readLastDate()))
  const [staleTasks, setStaleTasks] = useState<Task[]>([])
  const [showPurge, setShowPurge] = useState(false)
  const [showRetro, setShowRetro] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [globalStarredCount, setGlobalStarredCount] = useState(0)
  const [retroReport, setRetroReport] = useState<RetroReport | null>(null)
  const [retroError, setRetroError] = useState<string | null>(null)
  const [retroLoading, setRetroLoading] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [appUser, setAppUser] = useState<{ name: string; email: string; avatar: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') } catch { return null }
  })
  const pendingSaves = useRef<Set<Promise<void>>>(new Set())

  function navigateTo(date: string) {
    saveLastDate(date)
    setViewedDate(date)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const user = {
        name: data.user.user_metadata?.full_name ?? data.user.email ?? '',
        email: data.user.email ?? '',
        avatar: data.user.user_metadata?.avatar_url ?? '',
      }
      setAppUser(user)
      try { localStorage.setItem(USER_KEY, JSON.stringify(user)) } catch { /* ignore */ }
    })
  }, [])

  async function handleLogout() {
    await Promise.allSettled(Array.from(pendingSaves.current))
    const supabase = createClient()
    localStorage.removeItem(LOG_CACHE_KEY)
    localStorage.removeItem(LAST_DATE_KEY)
    localStorage.removeItem(USER_KEY)
    await supabase.auth.signOut()
  }

  // On mount: prefetch today ±2 days in background
  useEffect(() => {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const d = offsetLocalDate(today, offset)
      if (!cache.current.has(d)) {
        getLogByDate(d).then(l => persistLogCache(cache.current, d, l))
      }
    }
    getStaleTasks(3).then(stale => {
      setStaleTasks(stale)
      if (stale.length > 0) setTimeout(() => setShowPurge(true), 800)
    })
  }, [today])

  useEffect(() => {
    const cached = cache.current.get(viewedDate)
    if (cached) {
      setLog(cached)
      setLogLoading(false)
      // Revalidate in background — update silently if data changed
      getLogByDate(viewedDate).then(fresh => {
        persistLogCache(cache.current, viewedDate, fresh)
        setLog(prev => prev.date === viewedDate ? fresh : prev)
      })
    } else {
      setLogLoading(true)
      setLog({ date: viewedDate, tasks: [], note: '' })
      getLogByDate(viewedDate).then(l => {
        persistLogCache(cache.current, viewedDate, l)
        setLog(l)
        setLogLoading(false)
      })
    }
    // Prefetch adjacent dates
    for (const offset of [-1, 1]) {
      const adj = offsetLocalDate(viewedDate, offset)
      if (!cache.current.has(adj)) {
        getLogByDate(adj).then(l => persistLogCache(cache.current, adj, l))
      }
    }
  }, [viewedDate])

  useEffect(() => {
    getGlobalStarredCount().then(setGlobalStarredCount)
  }, [log])

  function updateLog(updater: (prev: DailyLog) => DailyLog) {
    setLog(prev => {
      const next = updater(prev)
      persistLogCache(cache.current, next.date, next)
      const p = saveLogByDate(next).catch(console.error) as Promise<void>
      pendingSaves.current.add(p)
      p.finally(() => pendingSaves.current.delete(p))
      return next
    })
  }

  function handleAddTask(text: string, tags: string[], starred: boolean) {
    const task: Task = {
      id: generateId(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
      mentions: extractMentions(text),
      tags,
      starred,
    }
    updateLog(prev => ({ ...prev, tasks: [task, ...prev.tasks] }))
  }

  function handleToggleTask(id: string) {
    updateLog(prev => {
      const task = prev.tasks.find(t => t.id === id)
      if (!task) return prev
      const updated = { ...task, done: !task.done, doneAt: !task.done ? new Date().toISOString() : undefined }
      if (task.done) {
        return { ...prev, tasks: [updated, ...prev.tasks.filter(t => t.id !== id)] }
      }
      return { ...prev, tasks: prev.tasks.map(t => t.id === id ? updated : t) }
    })
  }

  function handleToggleStar(id: string) {
    updateLog(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, starred: !t.starred } : t),
    }))
  }

  function handleUpdateTags(id: string, tags: string[]) {
    updateLog(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, tags } : t),
    }))
  }

  function handleUpdateText(id: string, text: string) {
    if (!text.trim()) return
    updateLog(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === id ? { ...t, text: text.trim(), mentions: extractMentions(text) } : t
      ),
    }))
  }

  function handleDeleteTask(id: string) {
    updateLog(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }))
  }

  function handleNoteChange(note: string) {
    updateLog(prev => ({ ...prev, note }))
  }

  async function handlePurgeAction(taskId: string, action: 'keep' | 'done' | 'discard') {
    if (action === 'keep') {
      await updateTaskAcrossLogs(taskId, t => ({ ...t, createdAt: new Date().toISOString() }))
    } else if (action === 'done') {
      await updateTaskAcrossLogs(taskId, t => ({ ...t, done: true, doneAt: new Date().toISOString() }))
    } else {
      await updateTaskAcrossLogs(taskId, () => null)
    }
    setStaleTasks(prev => {
      const next = prev.filter(t => t.id !== taskId)
      if (next.length === 0) setShowPurge(false)
      return next
    })
    getLogByDate(viewedDate).then(setLog)
  }

  async function handleGenerateRetro() {
    setRetroLoading(true)
    setRetroError(null)
    try {
      const report = await generateRetro(await getWeekLogs(), getApiKey())
      setRetroReport(report)
    } catch (err: unknown) {
      setRetroError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRetroLoading(false)
    }
  }

  const isToday = viewedDate === today
  const doneTasks = log.tasks.filter(t => t.done).length
  const totalTasks = log.tasks.length

  return (
    <main className="min-h-screen bg-black text-white">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRetroClick={() => setShowRetro(true)}
        onSettingsClick={() => setShowSettings(true)}
        user={appUser}
        onLogout={handleLogout}
      />

      {/* Daily Management */}
      {activeTab === 'daily' && (
        <div className="max-w-6xl mx-auto px-8 py-10">

          {/* Two-column layout */}
          <div className="grid grid-cols-[1fr_272px] gap-10">
            <div className="min-w-0">

              {/* Date navigation — lives inside left column so right edge aligns with task input */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl tracking-tight whitespace-nowrap select-none">
                    <span className="font-semibold text-white">{formatHeaderDate(viewedDate).day}</span>
                    <span className="font-light text-zinc-500 ml-2.5">{formatHeaderDate(viewedDate).date}</span>
                  </h1>

                  <div className="relative flex items-center gap-1">
                    <button
                      onClick={() => navigateTo(offsetLocalDate(viewedDate, -1))}
                      className="p-1.5 text-zinc-300 hover:text-white transition-colors duration-150"
                    >
                      <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="10 3 5 8 10 13" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateTo(offsetLocalDate(viewedDate, 1))}
                      className="p-1.5 text-zinc-300 hover:text-white transition-colors duration-150"
                    >
                      <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 3 11 8 6 13" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCalOpen(o => !o)}
                      className={`p-1.5 transition-colors duration-150
                        ${calOpen ? 'text-indigo-400' : 'text-zinc-300 hover:text-white'}`}
                    >
                      <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="12" height="11" rx="1.5" />
                        <line x1="2" y1="7" x2="14" y2="7" />
                        <line x1="5.5" y1="1.5" x2="5.5" y2="5" />
                        <line x1="10.5" y1="1.5" x2="10.5" y2="5" />
                      </svg>
                    </button>

                    <div className="w-px h-4 bg-zinc-800 mx-1" />

                    <button
                      onClick={() => { if (!isToday) navigateTo(today) }}
                      className="text-xs px-3.5 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all duration-150"
                    >
                      Today
                    </button>

                    {calOpen && (
                      <CalendarPopover
                        viewedDate={viewedDate}
                        today={today}
                        onSelect={navigateTo}
                        onClose={() => setCalOpen(false)}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-2 pl-1">
                  <p className="text-sm text-zinc-500">{getSubtitle(viewedDate, today)}</p>
                </div>
              </div>

              <TaskInput onAdd={handleAddTask} />
              {logLoading ? (
                <div className="mt-6 space-y-3">
                  {[72, 52, 88].map((w, i) => (
                    <div key={i} className="flex items-center gap-3 px-1 py-1.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
                      <div className="h-3.5 rounded-md bg-zinc-800 animate-pulse" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <TaskList
                    tasks={log.tasks}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onToggleStar={handleToggleStar}
                    onUpdateTags={handleUpdateTags}
                    onUpdateText={handleUpdateText}
                  />
                  {totalTasks > 0 && (
                    <div className="mt-8 pt-4 border-t border-zinc-900">
                      <div className="flex justify-between text-xs text-zinc-700 mb-1.5">
                        <span>{doneTasks} of {totalTasks} done</span>
                        <span>{Math.round((doneTasks / totalTasks) * 100)}%</span>
                      </div>
                      <div className="h-px bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="sticky top-24 self-start pt-1">
              <NotesScratchpad value={log.note} onChange={handleNoteChange} />
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {activeTab === 'feed' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none">
          <p className="text-2xl font-light text-zinc-600">I am cooking something</p>
          <p className="text-sm text-zinc-800 mt-2">Check back soon</p>
        </div>
      )}

      {/* Starred Tasks */}
      {activeTab === 'starred' && (
        <StarredView
          onNavigateToDate={(date) => {
            navigateTo(date)
            setActiveTab('daily')
          }}
        />
      )}

      {showPurge && (
        <PurgeModal tasks={staleTasks} onAction={handlePurgeAction} onClose={() => setShowPurge(false)} />
      )}
      {showRetro && (
        <RetroModal
          onGenerate={handleGenerateRetro}
          report={retroReport}
          error={retroError}
          loading={retroLoading}
          onClose={() => setShowRetro(false)}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </main>
  )
}
