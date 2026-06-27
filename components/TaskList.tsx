'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Task } from '@/lib/types'
import { getDayAge, cleanText } from '@/lib/hygiene'
import { CheckCircle2, Circle, Trash2, Star, Tag, GitBranch, Plus, MoreHorizontal } from 'lucide-react'
import TagChips from './TagChips'
import TagPicker from './TagPicker'
import PersonChip from './PersonChip'

interface TaskListProps {
  tasks: Task[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
  onUpdateText: (id: string, text: string) => void
  onToggleBranch: (id: string) => void
  onAddSubtask: (parentId: string, text: string) => void
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

export default function TaskList({ tasks, onToggle, onDelete, onToggleStar, onUpdateTags, onUpdateText, onToggleBranch, onAddSubtask, selectedIds, onSelectionChange }: TaskListProps) {
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [newlyCompletedIds, setNewlyCompletedIds] = useState<Set<string>>(new Set())
  const [uncompletingIds, setUncompletingIds] = useState<Set<string>>(new Set())
  const [newlyUncompletedIds, setNewlyUncompletedIds] = useState<Set<string>>(new Set())

  const isDragging = useRef(false)
  const dragStartId = useRef<string | null>(null)
  const dragDidMove = useRef(false)
  const dragPath = useRef<string[]>([])
  const preExistingIds = useRef<Set<string>>(new Set())
  const selectedRef = useRef(selectedIds)
  selectedRef.current = selectedIds
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange

  useEffect(() => {
    function handleMouseUp() {
      if (isDragging.current && !dragDidMove.current && dragStartId.current) {
        const next = new Set(selectedRef.current)
        const id = dragStartId.current
        if (next.has(id)) next.delete(id)
        else next.add(id)
        onSelectionChangeRef.current(next)
      }
      isDragging.current = false
      dragStartId.current = null
      dragDidMove.current = false
      dragPath.current = []
      document.body.style.userSelect = ''
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  function handleDragStart(id: string) {
    isDragging.current = true
    dragStartId.current = id
    dragDidMove.current = false
    dragPath.current = []
    preExistingIds.current = new Set(selectedRef.current)
    document.body.style.userSelect = 'none'
  }

  function handleDragEnter(id: string) {
    if (!isDragging.current) return
    if (id === dragPath.current[dragPath.current.length - 1]) return

    dragDidMove.current = true

    if (dragPath.current.length === 0 && dragStartId.current) {
      dragPath.current = [dragStartId.current]
    }

    const path = dragPath.current
    const existingIndex = path.indexOf(id)

    if (existingIndex !== -1) {
      path.splice(existingIndex + 1)
    } else {
      path.push(id)
    }

    const next = new Set(preExistingIds.current)
    for (const pid of path) next.add(pid)
    onSelectionChangeRef.current(next)
  }

  function handleToggleClick(task: Task) {
    if (task.done) {
      setUncompletingIds(prev => new Set([...prev, task.id]))
    } else {
      setCompletingIds(prev => new Set([...prev, task.id]))
    }
  }

  function handleCompletingCollapsed(taskId: string) {
    onToggle(taskId)
    setCompletingIds(prev => { const n = new Set(prev); n.delete(taskId); return n })
    setNewlyCompletedIds(prev => new Set([...prev, taskId]))
    setTimeout(() => {
      setNewlyCompletedIds(prev => { const n = new Set(prev); n.delete(taskId); return n })
    }, 400)
  }

  function handleUncompletingCollapsed(taskId: string) {
    onToggle(taskId)
    setUncompletingIds(prev => { const n = new Set(prev); n.delete(taskId); return n })
    setNewlyUncompletedIds(prev => new Set([...prev, taskId]))
    setTimeout(() => {
      setNewlyUncompletedIds(prev => { const n = new Set(prev); n.delete(taskId); return n })
    }, 400)
  }

  // Separate root tasks from subtasks
  const rootTasks = tasks.filter(t => !t.parentId)
  const subtaskMap = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.parentId) {
      const arr = subtaskMap.get(task.parentId) ?? []
      arr.push(task)
      subtaskMap.set(task.parentId, arr)
    }
  }

  if (rootTasks.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-700 text-sm select-none">
        No tasks yet — add one above
      </div>
    )
  }

  const pending = rootTasks.filter(t => !t.done)
  const done = rootTasks.filter(t => t.done)

  return (
    <div>
      {pending.map(task => {
        const completing = completingIds.has(task.id)
        const newlyUncompleted = newlyUncompletedIds.has(task.id)
        return (
          <div key={task.id}>
            <CollapsingRow collapsing={completing} onCollapsed={() => handleCompletingCollapsed(task.id)}>
              <TaskRow
                task={task}
                completing={completing}
                uncompleting={false}
                newlyCompleted={false}
                newlyUncompleted={newlyUncompleted}
                selected={selectedIds.has(task.id)}
                onToggle={() => handleToggleClick(task)}
                onDelete={onDelete}
                onToggleStar={onToggleStar}
                onUpdateTags={onUpdateTags}
                onUpdateText={onUpdateText}
                onToggleBranch={onToggleBranch}
                onAddSubtask={onAddSubtask}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
              />
            </CollapsingRow>
            {task.branch && (
              <SubtaskSection
                subtasks={subtaskMap.get(task.id) ?? []}
                onAdd={(text) => onAddSubtask(task.id, text)}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            )}
          </div>
        )
      })}

      {done.length > 0 && (
        <>
          <div className="pt-5 pb-1.5">
            <span className="text-xs font-semibold tracking-widest uppercase text-zinc-700">
              Completed · {done.length}
            </span>
          </div>
          {done.map(task => (
            <CollapsingRow key={task.id} collapsing={uncompletingIds.has(task.id)} onCollapsed={() => handleUncompletingCollapsed(task.id)}>
              <TaskRow
                task={task}
                completing={false}
                uncompleting={uncompletingIds.has(task.id)}
                newlyCompleted={newlyCompletedIds.has(task.id)}
                newlyUncompleted={false}
                selected={selectedIds.has(task.id)}
                onToggle={() => handleToggleClick(task)}
                onDelete={onDelete}
                onToggleStar={onToggleStar}
                onUpdateTags={onUpdateTags}
                onUpdateText={onUpdateText}
                onToggleBranch={onToggleBranch}
                onAddSubtask={onAddSubtask}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
              />
            </CollapsingRow>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Subtask section ──────────────────────────────────────────────────────────

function SubtaskSection({ subtasks, onAdd, onToggle, onDelete }: {
  subtasks: Task[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit() {
    if (inputVal.trim()) {
      onAdd(inputVal.trim())
      setInputVal('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="ml-5 pl-3.5 border-l border-zinc-800/70 mb-1">
      {subtasks.map(task => (
        <SubtaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
      <div className="flex items-center gap-2 py-1 pr-2">
        <Plus size={11} className="text-zinc-700 flex-shrink-0" />
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleSubmit() }
          }}
          placeholder="Add subtask…"
          className="flex-1 bg-transparent text-xs text-zinc-400 placeholder-zinc-700 outline-none"
        />
      </div>
    </div>
  )
}

function SubtaskRow({ task, onToggle, onDelete }: {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="group flex items-center gap-2 px-1 py-1 rounded-md hover:bg-zinc-900 transition-colors duration-100">
      <button
        onClick={() => onToggle(task.id)}
        className={`flex-shrink-0 transition-colors duration-200
          ${task.done ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-300'}`}
      >
        {task.done ? <CheckCircle2 size={12} /> : <Circle size={12} />}
      </button>
      <span className={`flex-1 text-xs leading-snug select-none
        ${task.done ? 'line-through text-zinc-600' : 'text-zinc-400'}`}
      >
        {task.text}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="p-0.5 rounded text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all duration-100"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ─── CollapsingRow ────────────────────────────────────────────────────────────

// Animates a row's height to 0 using direct DOM manipulation.
// React state cannot be used here: React 18 batches state updates inside rAF callbacks,
// so the browser never sees the intermediate height and the CSS transition never fires.
// Direct el.style writes are synchronous and bypass React's batching entirely.
function CollapsingRow({ collapsing, children, onCollapsed }: {
  collapsing: boolean
  children: React.ReactNode
  onCollapsed: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const cbRef = useRef(onCollapsed)
  cbRef.current = onCollapsed

  useEffect(() => {
    if (!collapsing || !ref.current) return
    const el = ref.current

    el.style.overflow = 'hidden'
    el.style.transition = 'none'
    el.style.height = `${el.scrollHeight}px`

    const id = requestAnimationFrame(() => {
      el.style.transition = 'height 500ms cubic-bezier(0.4, 0, 0.2, 1)'
      el.style.height = '0px'
    })

    return () => cancelAnimationFrame(id)
  }, [collapsing])

  return (
    <div
      ref={ref}
      onTransitionEnd={(e) => {
        if (e.target === ref.current && e.propertyName === 'height') cbRef.current()
      }}
    >
      {children}
    </div>
  )
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  completing,
  uncompleting,
  newlyCompleted,
  newlyUncompleted,
  selected,
  onToggle,
  onDelete,
  onToggleStar,
  onUpdateTags,
  onUpdateText,
  onToggleBranch,
  onAddSubtask,
  onDragStart,
  onDragEnter,
}: {
  task: Task
  completing: boolean
  uncompleting: boolean
  newlyCompleted: boolean
  newlyUncompleted: boolean
  selected: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
  onUpdateText: (id: string, text: string) => void
  onToggleBranch: (id: string) => void
  onAddSubtask: (parentId: string, text: string) => void
  onDragStart: (id: string) => void
  onDragEnter: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const tagContainerRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fillTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  const PRESS_DELAY = 150
  const PRESS_DURATION = 500

  // Track tagPickerOpen in a ref so the menu close handler always sees the latest value
  const tagPickerOpenRef = useRef(false)
  tagPickerOpenRef.current = tagPickerOpen

  // Close "..." menu on outside click — use 'click' (not mousedown) so trackpad
  // scroll gestures don't accidentally close it. Also pause while TagPicker is open.
  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (tagPickerOpenRef.current) return
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpen])

  function startPress() {
    if (visuallyDone || editing) return
    fillTimer.current = setTimeout(() => {
      const fill = fillRef.current
      if (!fill) return
      fill.style.transition = 'none'
      fill.style.width = '0%'
      fill.style.opacity = '1'
      requestAnimationFrame(() => {
        fill.style.transition = `width ${PRESS_DURATION}ms linear`
        fill.style.width = '100%'
      })
    }, PRESS_DELAY)
    pressTimer.current = setTimeout(() => {
      const fill = fillRef.current
      if (fill) { fill.style.width = '0%'; fill.style.opacity = '0'; fill.style.transition = 'none' }
      onToggle()
    }, PRESS_DELAY + PRESS_DURATION)
  }

  function cancelPress() {
    if (fillTimer.current) { clearTimeout(fillTimer.current); fillTimer.current = null }
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
    const fill = fillRef.current
    if (!fill) return
    fill.style.transition = 'none'
    fill.style.width = '0%'
    fill.style.opacity = '0'
  }

  const age = getDayAge(task.createdAt)
  const isStale = !task.done && !completing && !uncompleting && age >= 3
  const tags = task.tags ?? []
  const mentions = task.mentions ?? []
  const displayText = cleanText(task.text)
  const visuallyDone = task.done || completing

  function startEdit() {
    if (visuallyDone) return
    setEditValue(displayText)
    setEditing(true)
  }

  useEffect(() => {
    if (editing) {
      const ta = inputRef.current
      if (!ta) return
      ta.focus()
      ta.selectionStart = ta.selectionEnd = ta.value.length
    }
  }, [editing])

  useEffect(() => {
    const ta = inputRef.current
    if (!ta || !editing) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [editValue, editing])

  const commitEdit = useCallback(() => {
    const lines = editValue.split('\n')
    const firstLine = lines[0].trim()
    const subtaskLines = lines.slice(1)
      .filter(l => l.startsWith('\t') && l.slice(1).trim())
      .map(l => l.slice(1).trim())

    if (firstLine && firstLine !== displayText) {
      onUpdateText(task.id, firstLine)
    }
    if (subtaskLines.length > 0 && !task.branch) {
      onToggleBranch(task.id)
    }
    for (const text of subtaskLines) {
      onAddSubtask(task.id, text)
    }
    setEditing(false)
  }, [editValue, displayText, task.id, task.branch, onUpdateText, onToggleBranch, onAddSubtask])

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget
    if (e.key === 'Escape') { setEditing(false); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); return }
    if (e.key === 'Tab') {
      e.preventDefault()
      const { selectionStart, value: v } = ta
      const lineStart = v.lastIndexOf('\n', selectionStart - 1) + 1
      const lineText = v.slice(lineStart)
      if (!e.shiftKey) {
        if (!lineText.startsWith('\t')) {
          setEditValue(v.slice(0, lineStart) + '\t' + v.slice(lineStart))
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + 1 })
        }
      } else {
        if (lineText.startsWith('\t')) {
          setEditValue(v.slice(0, lineStart) + v.slice(lineStart + 1))
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = Math.max(lineStart, selectionStart - 1) })
        }
      }
    }
  }

  return (
    <div
      onDoubleClick={!visuallyDone && !editing ? startEdit : undefined}
      onMouseDown={() => { startPress(); if (!editing) onDragStart(task.id) }}
      onMouseUp={cancelPress}
      onMouseLeave={() => { cancelPress(); setMenuOpen(false); setTagPickerOpen(false) }}
      onMouseEnter={() => onDragEnter(task.id)}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      className={[
        'group relative flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors duration-150',
        newlyCompleted ? 'task-slide-in' : '',
        newlyUncompleted ? 'task-slide-in-from-below' : '',
        completing ? 'task-exiting' : '',
        uncompleting ? 'task-exiting-up' : '',
        selected ? 'bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/25' : '',
        !selected && !completing && !uncompleting && !newlyCompleted && !newlyUncompleted
          ? 'hover:bg-zinc-900'
          : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Press-to-complete fill animation */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0"
          style={{ width: '0%', opacity: 0, background: 'linear-gradient(90deg, rgba(34,197,94,0.35), rgba(34,197,94,0.12))' }}
        />
      </div>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        onDoubleClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        className={`flex-shrink-0 transition-colors duration-200
          ${visuallyDone ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-300'}`}
      >
        {visuallyDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      </button>

      {/* Text + mentions — stays within its column, never bleeds into tags */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            rows={1}
            style={{ resize: 'none', overflow: 'hidden', lineHeight: '21px', caretColor: '#818cf8' }}
            className="w-full bg-transparent text-sm text-zinc-200 outline-none border-b border-zinc-600 focus:border-indigo-500 transition-colors duration-150 py-0.5"
          />
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm leading-snug transition-all duration-200 select-none
              ${visuallyDone ? 'line-through text-zinc-400' : 'text-zinc-200'}`}
            >
              {displayText}
            </span>
            {mentions.map(m => <PersonChip key={m} name={m} />)}
          </div>
        )}
      </div>

      {/* Right section — fixed layout so tags column is always at the same X position */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onDoubleClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Overdue — hover only, fixed width slot so tags don't shift */}
        {!editing && (
          <div className="w-12 flex justify-end">
            {isStale && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-amber-500 tabular-nums select-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                🔥 {age}d
              </span>
            )}
          </div>
        )}

        {/* Tags column — fixed min-width so all rows align */}
        {!editing && (
          <div className="min-w-[80px] flex justify-end">
            {tags.length > 0 && <TagChips tags={tags} limit={2} />}
          </div>
        )}

        {/* Hover-only actions */}
        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {/* Star */}
            <button
              onClick={() => onToggleStar(task.id)}
              className={`p-1 rounded-md transition-colors duration-150
                ${task.starred
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
            >
              <Star size={13} fill={task.starred ? 'currentColor' : 'none'} />
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150"
            >
              <Trash2 size={13} />
            </button>

            {/* "..." menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setMenuOpen(o => !o); setTagPickerOpen(false) }}
                className={`p-1 rounded-md transition-colors duration-150
                  ${menuOpen ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              >
                <MoreHorizontal size={13} />
              </button>

              {menuOpen && (
                <div
                  style={{ background: '#09090b' }}
                  className="absolute right-0 top-full mt-1.5 z-50 w-48
                             border border-zinc-800 rounded-xl shadow-2xl py-1"
                >
                  {/* Branch toggle */}
                  <button
                    onClick={() => { onToggleBranch(task.id); setMenuOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100
                      ${task.branch
                        ? 'text-indigo-400 hover:bg-zinc-900'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                  >
                    <GitBranch size={13} />
                    {task.branch ? 'Remove subtasks' : 'Add subtasks'}
                  </button>

                  {/* Tag editor */}
                  <div ref={tagContainerRef} className="relative">
                    <button
                      onClick={() => setTagPickerOpen(o => !o)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100
                        ${tagPickerOpen ? 'text-indigo-400 bg-zinc-900' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                    >
                      <Tag size={13} />
                      Edit tags
                    </button>
                    {tagPickerOpen && (
                      <TagPicker
                        selected={tags}
                        onChange={newTags => onUpdateTags(task.id, newTags)}
                        onClose={() => setTagPickerOpen(false)}
                        containerRef={menuRef}
                        placement="down"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
