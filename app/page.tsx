'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import TaskInput from '@/components/TaskInput'
import TaskList from '@/components/TaskList'
import NotesScratchpad from '@/components/NotesScratchpad'
import PurgeModal from '@/components/PurgeModal'
import RetroModal from '@/components/RetroModal'
import SettingsModal from '@/components/SettingsModal'
import StarredView from '@/components/StarredView'
import { Task, DailyLog, RetroReport } from '@/lib/types'
import { generateId, extractMentions, localDateISO } from '@/lib/hygiene'
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

function todayISO(): string {
  return localDateISO()
}

export default function Dashboard() {
  const [today] = useState(todayISO)
  const [viewedDate, setViewedDate] = useState(todayISO)
  const [log, setLog] = useState<DailyLog>({ date: '', tasks: [], note: '' })
  const [staleTasks, setStaleTasks] = useState<Task[]>([])
  const [showPurge, setShowPurge] = useState(false)
  const [showRetro, setShowRetro] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStarred, setShowStarred] = useState(false)
  const [globalStarredCount, setGlobalStarredCount] = useState(0)
  const [retroReport, setRetroReport] = useState<RetroReport | null>(null)
  const [retroError, setRetroError] = useState<string | null>(null)
  const [retroLoading, setRetroLoading] = useState(false)

  useEffect(() => {
    setLog(getLogByDate(today))
    const stale = getStaleTasks(3)
    setStaleTasks(stale)
    if (stale.length > 0) setTimeout(() => setShowPurge(true), 800)
  }, [today])

  useEffect(() => {
    setLog(getLogByDate(viewedDate))
  }, [viewedDate])

  // Recompute global starred count after every log save.
  // This runs after the render that follows saveLogByDate, so localStorage is always current.
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
        // Uncompleting: surface to top of the pending list
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

  if (showStarred) {
    return (
      <StarredView
        onBack={(navigateToDate?: string) => {
          if (navigateToDate) setViewedDate(navigateToDate)
          setShowStarred(false)
          // Re-read log so useEffect([log]) picks up any star changes made inside StarredView
          setLog(getLogByDate(navigateToDate ?? viewedDate))
        }}
      />
    )
  }

  const doneTasks = log.tasks.filter(t => t.done).length
  const totalTasks = log.tasks.length

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-8 py-10">

        <Header
          viewedDate={viewedDate}
          today={today}
          onDateChange={setViewedDate}
          onRetroClick={() => setShowRetro(true)}
          onSettingsClick={() => setShowSettings(true)}
          onStarredClick={() => setShowStarred(true)}
          staleCount={staleTasks.length}
          starredCount={globalStarredCount}
        />

        {/* Two-column layout: tasks left, scratchpad sticky right */}
        <div className="grid grid-cols-[1fr_272px] gap-10">

          {/* Left — primary task area */}
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

          {/* Right — scratchpad, stays in view while tasks scroll */}
          <div className="sticky top-10 self-start pt-1">
            <NotesScratchpad value={log.note} onChange={handleNoteChange} />
          </div>

        </div>
      </div>

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
