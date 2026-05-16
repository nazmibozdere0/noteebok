'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Task } from '@/lib/types'
import { getDayAge, cleanText } from '@/lib/hygiene'
import { CheckCircle2, Circle, Flame, Trash2, Star, Tag } from 'lucide-react'
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
}

export default function TaskList({ tasks, onToggle, onDelete, onToggleStar, onUpdateTags, onUpdateText }: TaskListProps) {
  // Tracks tasks in the middle of their completion animation.
  // They stay rendered in the pending list while animating, then disappear when onToggle fires.
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  // Tracks tasks that just landed in the completed section — triggers entrance animation.
  const [newlyCompletedIds, setNewlyCompletedIds] = useState<Set<string>>(new Set())

  // Tracks tasks being animated out of the completed section (back to pending).
  const [uncompletingIds, setUncompletingIds] = useState<Set<string>>(new Set())

  // Tracks tasks that just landed back in the pending section — triggers entrance animation.
  const [newlyUncompletedIds, setNewlyUncompletedIds] = useState<Set<string>>(new Set())

  function handleToggleClick(task: Task) {
    if (task.done) {
      setUncompletingIds(prev => new Set([...prev, task.id]))
    } else {
      setCompletingIds(prev => new Set([...prev, task.id]))
    }
  }

  // Called by CollapsingRow via onTransitionEnd — fires exactly when height reaches 0
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

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-700 text-sm select-none">
        No tasks yet — add one above
      </div>
    )
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div>
      {pending.map(task => {
        const completing = completingIds.has(task.id)
        const newlyUncompleted = newlyUncompletedIds.has(task.id)
        return (
          <CollapsingRow key={task.id} collapsing={completing} onCollapsed={() => handleCompletingCollapsed(task.id)}>
            <TaskRow
              task={task}
              completing={completing}
              uncompleting={false}
              newlyCompleted={false}
              newlyUncompleted={newlyUncompleted}
              onToggle={() => handleToggleClick(task)}
              onDelete={onDelete}
              onToggleStar={onToggleStar}
              onUpdateTags={onUpdateTags}
              onUpdateText={onUpdateText}
            />
          </CollapsingRow>
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
                onToggle={() => handleToggleClick(task)}
                onDelete={onDelete}
                onToggleStar={onToggleStar}
                onUpdateTags={onUpdateTags}
                onUpdateText={onUpdateText}
              />
            </CollapsingRow>
          ))}
        </>
      )}
    </div>
  )
}

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
  // Keep a ref to onCollapsed so the transitionend handler always calls the latest version
  const cbRef = useRef(onCollapsed)
  cbRef.current = onCollapsed

  useEffect(() => {
    if (!collapsing || !ref.current) return
    const el = ref.current

    // Reading scrollHeight forces a synchronous layout flush —
    // the browser commits height=Xpx before we start the transition
    el.style.overflow = 'hidden'
    el.style.transition = 'none'
    el.style.height = `${el.scrollHeight}px`

    // Next frame: browser has painted height=Xpx, now we can transition to 0
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
        // Guard: only fire for our own height transition, not bubbled child transitions
        if (e.target === ref.current && e.propertyName === 'height') cbRef.current()
      }}
    >
      {children}
    </div>
  )
}

function TaskRow({
  task,
  completing,
  uncompleting,
  newlyCompleted,
  newlyUncompleted,
  onToggle,
  onDelete,
  onToggleStar,
  onUpdateTags,
  onUpdateText,
}: {
  task: Task
  completing: boolean
  uncompleting: boolean
  newlyCompleted: boolean
  newlyUncompleted: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
  onUpdateText: (id: string, text: string) => void
}) {
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fillTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  const PRESS_DELAY = 150
  const PRESS_DURATION = 500

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
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commitEdit = useCallback(() => {
    if (editValue.trim() && editValue.trim() !== displayText) {
      onUpdateText(task.id, editValue.trim())
    }
    setEditing(false)
  }, [editValue, displayText, task.id, onUpdateText])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false) }
  }

  return (
    <div
      onDoubleClick={!visuallyDone && !editing ? startEdit : undefined}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      className={[
        'group relative flex items-center gap-2 px-2 py-1.5 rounded-lg overflow-hidden',
        newlyCompleted ? 'task-slide-in' : '',
        newlyUncompleted ? 'task-slide-in-from-below' : '',
        completing ? 'task-exiting' : '',
        uncompleting ? 'task-exiting-up' : '',
        !completing && !uncompleting && !newlyCompleted && !newlyUncompleted
          ? 'hover:bg-zinc-900 transition-colors duration-150'
          : '',
      ].filter(Boolean).join(' ')}
    >
      <div
        ref={fillRef}
        className="absolute inset-y-0 left-0 rounded-lg pointer-events-none"
        style={{
          width: '0%',
          opacity: 0,
          background: 'linear-gradient(90deg, rgba(34,197,94,0.35), rgba(34,197,94,0.12))',
        }}
      />
      <button
        onClick={onToggle}
        onDoubleClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        className={`flex-shrink-0 transition-colors duration-200
          ${visuallyDone ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-300'}`}
      >
        {visuallyDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      </button>

      <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none border-b border-zinc-600 focus:border-indigo-500 transition-colors duration-150 py-0.5 min-w-0"
          />
        ) : (
          <>
            <span className={`text-sm leading-snug transition-all duration-200 select-none
              ${visuallyDone ? 'line-through text-zinc-400' : 'text-zinc-200'}`}
            >
              {displayText}
            </span>
            {mentions.map(m => <PersonChip key={m} name={m} />)}
            <TagChips tags={tags} limit={2} />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0" onDoubleClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        {isStale && !editing && (
          <span title={`${age}d old`} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <Flame size={13} />
          </span>
        )}
        {!visuallyDone && !editing && (
          <span className="text-[10px] text-zinc-600 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
            {age}d
          </span>
        )}
        {!editing && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setTagPickerOpen(o => !o)}
              className={`p-1 rounded-md transition-all duration-150
                ${tagPickerOpen
                  ? 'text-indigo-400 bg-indigo-500/15'
                  : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
              title="Edit tags"
            >
              <Tag size={13} />
            </button>
            {tagPickerOpen && (
              <TagPicker
                selected={tags}
                onChange={newTags => onUpdateTags(task.id, newTags)}
                onClose={() => setTagPickerOpen(false)}
                placement="down"
              />
            )}
          </div>
        )}
        {!editing && (
          <button
            onClick={() => onToggleStar(task.id)}
            className={`p-1 rounded-md transition-all duration-150
              ${task.starred
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-amber-500/10'}`}
          >
            <Star size={13} fill={task.starred ? 'currentColor' : 'none'} />
          </button>
        )}
        {!editing && (
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded-md text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
