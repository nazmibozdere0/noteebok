'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Star, Search, X, CheckCircle2, Circle, ArrowUpRight, Users } from 'lucide-react'
import { getStarredTasks, updateTaskAcrossLogs, StarredTask } from '@/lib/storage'
import { localDateISO, cleanText } from '@/lib/hygiene'
import { getAllTags, getTagClass } from '@/lib/tags'
import TagChips from './TagChips'
import PersonChip from './PersonChip'

interface StarredViewProps {
  onNavigateToDate: (date: string) => void
}

type StatusFilter = 'all' | 'done' | 'undone'

function formatGroupDate(iso: string): string {
  const today = localDateISO()
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return localDateISO(d)
  })()
  if (iso === today) return 'Today'
  if (iso === yesterday) return 'Yesterday'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}


const STARRED_CACHE_KEY = 'nb_starred_cache'

function readStarredCache(): StarredTask[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STARRED_CACHE_KEY)
    return raw ? (JSON.parse(raw) as StarredTask[]) : []
  } catch { return [] }
}

function writeStarredCache(tasks: StarredTask[]) {
  try { localStorage.setItem(STARRED_CACHE_KEY, JSON.stringify(tasks)) } catch { /* ignore */ }
}

export default function StarredView({ onNavigateToDate }: StarredViewProps) {
  const [tasks, setTasks] = useState<StarredTask[]>(() => readStarredCache())
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [tagFilters, setTagFilters] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [showTagFilter, setShowTagFilter] = useState(false)
  const tagFilterRef = useRef<HTMLDivElement>(null)

  const [personFilters, setPersonFilters] = useState<string[]>([])
  const [showPersonFilter, setShowPersonFilter] = useState(false)
  const personFilterRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (tagFilterRef.current && !tagFilterRef.current.contains(e.target as Node)) {
        setShowTagFilter(false)
      }
      if (personFilterRef.current && !personFilterRef.current.contains(e.target as Node)) {
        setShowPersonFilter(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function reload() {
    const starred = await getStarredTasks()
    writeStarredCache(starred)
    setTasks(starred)
  }

  useEffect(() => {
    reload()
    setAvailableTags(getAllTags())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleDone(id: string) {
    await updateTaskAcrossLogs(id, t => ({
      ...t,
      done: !t.done,
      doneAt: !t.done ? new Date().toISOString() : undefined,
    }))
    reload()
  }

  async function handleUnstar(id: string) {
    await updateTaskAcrossLogs(id, t => ({ ...t, starred: false }))
    reload()
  }

  function toggleTagFilter(tag: string) {
    setTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function togglePersonFilter(person: string) {
    setPersonFilters(prev =>
      prev.includes(person) ? prev.filter(p => p !== person) : [...prev, person]
    )
  }

  // Derive unique persons from all starred tasks
  const availablePersons = useMemo(() => {
    const set = new Set<string>()
    for (const task of tasks) {
      for (const m of task.mentions ?? []) set.add(m)
    }
    return Array.from(set).sort()
  }, [tasks])

  // Filter + search
  const filtered = useMemo(() => {
    return tasks.filter(task => {
      if (query && !task.text.toLowerCase().includes(query.toLowerCase())) return false
      if (statusFilter === 'done' && !task.done) return false
      if (statusFilter === 'undone' && task.done) return false
      if (tagFilters.length > 0) {
        const taskTags = task.tags ?? []
        if (!tagFilters.some(tf => taskTags.includes(tf))) return false
      }
      if (personFilters.length > 0) {
        const taskMentions = task.mentions ?? []
        if (!personFilters.some(pf => taskMentions.includes(pf))) return false
      }
      return true
    })
  }, [tasks, query, statusFilter, tagFilters, personFilters])

  // Group by the log date the task belongs to (not createdAt, which can drift from the log date)
  const grouped = useMemo(() => {
    const map = new Map<string, StarredTask[]>()
    for (const task of filtered) {
      if (!map.has(task.logDate)) map.set(task.logDate, [])
      map.get(task.logDate)!.push(task)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + tagFilters.length + personFilters.length

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-2 mb-10">
          <Star size={15} className="text-amber-400" fill="currentColor" />
          <h1 className="text-base font-medium text-white">Starred Tasks</h1>
          <span className="text-xs text-zinc-600 tabular-nums">{tasks.length}</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search starred tasks…"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl
                       pl-9 pr-4 py-3 text-sm text-white placeholder-zinc-600 outline-none
                       transition-colors duration-150"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Status — segmented control */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {(['all', 'undone', 'done'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1 rounded-md transition-all duration-150
                    ${statusFilter === s
                      ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {s === 'all' ? 'All' : s === 'done' ? 'Done' : 'Undone'}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-zinc-800" />

            {/* Tag filter button */}
            <div className="relative" ref={tagFilterRef}>
              <button
                onClick={() => setShowTagFilter(o => !o)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-150
                  ${tagFilters.length > 0
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'}`}
              >
                Tags {tagFilters.length > 0 && `· ${tagFilters.length}`}
              </button>

              {showTagFilter && (
                <div className="absolute top-full mt-1 left-0 z-40 w-56 bg-zinc-950 border border-zinc-800
                                rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className="w-full flex items-center justify-between px-3 py-2
                                 hover:bg-zinc-900 transition-colors duration-100"
                    >
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getTagClass(tag)}`}>
                        {tag}
                      </span>
                      {tagFilters.includes(tag) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* People filter button */}
            {availablePersons.length > 0 && (
              <div className="relative" ref={personFilterRef}>
                <button
                  onClick={() => setShowPersonFilter(o => !o)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-150
                    ${personFilters.length > 0
                      ? 'bg-zinc-700/30 text-zinc-200 border-zinc-600'
                      : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'}`}
                >
                  <Users size={11} />
                  People {personFilters.length > 0 && `· ${personFilters.length}`}
                </button>

                {showPersonFilter && (
                  <div className="absolute top-full mt-1 left-0 z-40 w-48 bg-zinc-950 border border-zinc-800
                                  rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto">
                    {availablePersons.map(person => (
                      <button
                        key={person}
                        onClick={() => togglePersonFilter(person)}
                        className="w-full flex items-center justify-between px-3 py-2
                                   hover:bg-zinc-900 transition-colors duration-100"
                      >
                        <PersonChip name={person} />
                        {personFilters.includes(person) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clear all filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter('all'); setTagFilters([]); setPersonFilters([]) }}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Active tag + person chips */}
          {(tagFilters.length > 0 || personFilters.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {tagFilters.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border
                              transition-opacity hover:opacity-70 ${getTagClass(tag)}`}
                >
                  {tag}
                  <X size={9} />
                </button>
              ))}
              {personFilters.map(person => (
                <button
                  key={person}
                  onClick={() => togglePersonFilter(person)}
                  className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full
                             bg-zinc-800 border border-zinc-700 hover:opacity-70 transition-opacity"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-zinc-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] font-bold text-zinc-200 leading-none">
                      {person[0].toUpperCase()}
                    </span>
                  </span>
                  <span className="text-[10px] font-medium text-zinc-300">{person}</span>
                  <X size={9} className="text-zinc-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="text-center py-20 text-zinc-700 text-sm">
            <Star size={28} className="mx-auto mb-3 opacity-30" />
            <p>No starred tasks yet</p>
            <p className="text-xs mt-1 text-zinc-800">Star a task from the main view to pin it here</p>
          </div>
        )}

        {tasks.length > 0 && filtered.length === 0 && (
          <div className="text-center py-20 text-zinc-700 text-sm">
            No tasks match your filters
          </div>
        )}

        {/* Date-grouped task list */}
        <div className="space-y-8">
          {grouped.map(([dateKey, groupTasks]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-zinc-500">
                  {formatGroupDate(dateKey)}
                </span>
                <div className="flex-1 h-px bg-zinc-900" />
                <span className="text-xs text-zinc-700 tabular-nums">{groupTasks.length}</span>
              </div>

              <div className="space-y-1">
                {groupTasks.map(task => (
                  <StarredTaskRow
                    key={task.id}
                    task={task}
                    onToggleDone={handleToggleDone}
                    onUnstar={handleUnstar}
                    onViewOnDate={onNavigateToDate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

    </div>
  )
}

function StarredTaskRow({
  task,
  onToggleDone,
  onUnstar,
  onViewOnDate,
}: {
  task: StarredTask
  onToggleDone: (id: string) => void
  onUnstar: (id: string) => void
  onViewOnDate: (date: string) => void
}) {
  const tags = task.tags ?? []
  const mentions = task.mentions ?? []
  const displayText = cleanText(task.text)

  return (
    <div className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-100
      hover:bg-zinc-900 ${task.done ? 'opacity-50' : ''}`}
    >
      <button
        onClick={() => onToggleDone(task.id)}
        className={`flex-shrink-0 transition-colors duration-150
          ${task.done ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-300'}`}
      >
        {task.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      </button>

      <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-0">
        <span className={`text-sm leading-snug ${task.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
          {displayText}
        </span>
        {mentions.map(m => <PersonChip key={m} name={m} />)}
        <TagChips tags={tags} limit={2} />
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {/* View on date — navigates to main page with this task's date selected */}
        <button
          onClick={() => onViewOnDate(task.logDate)}
          className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-indigo-400
                     transition-colors duration-150 whitespace-nowrap"
        >
          <ArrowUpRight size={12} />
          see on date
        </button>

        {/* Unstar */}
        <button
          onClick={() => onUnstar(task.id)}
          className="p-0.5 rounded text-amber-400 hover:text-zinc-500 transition-colors duration-150"
          title="Remove star"
        >
          <Star size={12} fill="currentColor" />
        </button>
      </div>
    </div>
  )
}
