'use client'

import { useState, useEffect } from 'react'
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
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

function todayISO(): string { return localDateISO() }

function formatHeaderDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
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

export default function Dashboard() {
  const [today] = useState(todayISO)
  const [viewedDate, setViewedDate] = useState(todayISO)
  const [activeTab, setActiveTab] = useState<Tab>('daily')
  const [log, setLog] = useState<DailyLog>({ date: '', tasks: [], note: '' })
  const [staleTasks, setStaleTasks] = useState<Task[]>([])
  const [showPurge, setShowPurge] = useState(false)
  const [showRetro, setShowRetro] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [globalStarredCount, setGlobalStarredCount] = useState(0)
  const [retroReport, setRetroReport] = useState<RetroReport | null>(null)
  const [retroError, setRetroError] = useState<string | null>(null)
  const [retroLoading, setRetroLoading] = useState(false)
  const [calOpen, setCalOpen] = useState(false)

  useEffect(() => {
    setLog(getLogByDate(today))
    const stale = getStaleTasks(3)
    setStaleTasks(stale)
    if (stale.length > 0) setTimeout(() => setShowPurge(true), 800)
  }, [today])

  useEffect(() => {
    setLog(getLogByDate(viewedDate))
  }, [viewedDate])

  useEffect(() => {
    setGlobalStarredCount(getGlobalStarredCount())
  }, [log])

  function updateLog(updater: (prev: DailyLog) => DailyLog) {
    setLog(prev => {
      const next = updater(prev)
      saveLogByDate(next)
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

  function handleDeleteTask(id: string) {
    updateLog(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }))
  }

  function handleNoteChange(note: string) {
    updateLog(prev => ({ ...prev, note }))
  }

  function handlePurgeAction(taskId: string, action: 'keep' | 'done' | 'discard') {
    if (action === 'keep') {
      updateTaskAcrossLogs(taskId, t => ({ ...t, createdAt: new Date().toISOString() }))
    } else if (action === 'done') {
      updateTaskAcrossLogs(taskId, t => ({ ...t, done: true, doneAt: new Date().toISOString() }))
    } else {
      updateTaskAcrossLogs(taskId, () => null)
    }
    setStaleTasks(prev => {
      const next = prev.filter(t => t.id !== taskId)
      if (next.length === 0) setShowPurge(false)
      return next
    })
    setLog(getLogByDate(viewedDate))
  }

  async function handleGenerateRetro() {
    setRetroLoading(true)
    setRetroError(null)
    try {
      const report = await generateRetro(getWeekLogs(), getApiKey())
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
        starredCount={globalStarredCount}
      />

      {/* Daily Management */}
      {activeTab === 'daily' && (
        <div className="max-w-6xl mx-auto px-8 py-10">

          {/* Date navigation */}
          <div className="mb-8">
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setViewedDate(offsetLocalDate(viewedDate, -1))}
                className="p-1 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-900 transition-all duration-150"
              >
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setCalOpen(o => !o)} className="flex items-center gap-2 group">
                <h1 className="w-[340px] text-3xl font-light text-white tracking-tight group-hover:text-zinc-200 transition-colors">
                  {formatHeaderDate(viewedDate)}
                </h1>
                <CalendarDays size={15} className="text-zinc-700 group-hover:text-zinc-400 transition-colors mt-1" />
              </button>
              <button
                onClick={() => setViewedDate(offsetLocalDate(viewedDate, 1))}
                className="p-1 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-900 transition-all duration-150"
              >
                <ChevronRight size={16} />
              </button>
              {calOpen && (
                <CalendarPopover
                  viewedDate={viewedDate}
                  today={today}
                  onSelect={setViewedDate}
                  onClose={() => setCalOpen(false)}
                />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-zinc-500">{getSubtitle(viewedDate, today)}</p>
              {!isToday && (
                <button
                  onClick={() => setViewedDate(today)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30
                             hover:border-indigo-400/50 rounded-full px-2.5 py-0.5 transition-all duration-150"
                >
                  → Today
                </button>
              )}
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-[1fr_272px] gap-10">
            <div className="min-w-0">
              <TaskInput onAdd={handleAddTask} />
              <TaskList
                tasks={log.tasks}
                onToggle={handleToggleTask}
                onDelete={handleDeleteTask}
                onToggleStar={handleToggleStar}
                onUpdateTags={handleUpdateTags}
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
            setViewedDate(date)
            setActiveTab('daily')
            setLog(getLogByDate(date))
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
