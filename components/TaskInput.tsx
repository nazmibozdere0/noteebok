'use client'

import { useState, useRef, useEffect } from 'react'
import { Tag, Star, X, Trash2, SendHorizonal } from 'lucide-react'
import TagPicker from './TagPicker'
import { getTagStyle } from '@/lib/tags'

interface TaskInputProps {
  onAdd: (text: string, tags: string[], starred: boolean, subtasks?: string[]) => void
}

function parseLines(value: string): { text: string; subtasks: string[] }[] {
  const groups: { text: string; subtasks: string[] }[] = []
  let current: { text: string; subtasks: string[] } | null = null
  for (const line of value.split('\n')) {
    const indented = line.startsWith('\t')
    const text = indented ? line.slice(1).trim() : line.trim()
    if (!text) continue
    if (!indented) { current = { text, subtasks: [] }; groups.push(current) }
    else if (current) current.subtasks.push(text)
  }
  return groups
}

export default function TaskInput({ onAdd }: TaskInputProps) {
  const [value, setValue] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [starred, setStarred] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const tagAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  const lines = value.split('\n')
  const isMultiline = lines.length > 1
  const subtaskCount = lines.filter(l => l.startsWith('\t') && l.slice(1).trim()).length

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submitParsed()
      return
    }

    if (e.key === 'Enter') {
      const { selectionStart, value: v } = ta
      const lineStart = v.lastIndexOf('\n', selectionStart - 1) + 1
      const lineContent = v.slice(lineStart)
      const isIndented = lineContent.startsWith('\t')
      const isEmpty = (isIndented ? lineContent.slice(1) : lineContent).trim() === ''

      if (isIndented) {
        e.preventDefault()
        if (isEmpty) {
          const next = v.slice(0, lineStart) + v.slice(lineStart + 1)
          setValue(next)
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart })
        } else {
          const next = v.slice(0, selectionStart) + '\n\t' + v.slice(selectionStart)
          setValue(next)
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + 2 })
        }
        return
      }
      if (isEmpty) { e.preventDefault(); return }
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const { selectionStart, value: v } = ta
      const lineStart = v.lastIndexOf('\n', selectionStart - 1) + 1
      const lineText = v.slice(lineStart)
      if (!e.shiftKey) {
        if (!lineText.startsWith('\t')) {
          setValue(v.slice(0, lineStart) + '\t' + v.slice(lineStart))
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + 1 })
        }
      } else {
        if (lineText.startsWith('\t')) {
          setValue(v.slice(0, lineStart) + v.slice(lineStart + 1))
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = Math.max(lineStart, selectionStart - 1) })
        }
      }
    }
  }

  function submitParsed() {
    const groups = parseLines(value)
    if (groups.length === 0) return
    const [first, ...rest] = groups
    onAdd(first.text, tags, starred, first.subtasks.length > 0 ? first.subtasks : undefined)
    for (const g of rest) onAdd(g.text, [], false, g.subtasks.length > 0 ? g.subtasks : undefined)
    setValue('')
    setTags([])
    setStarred(false)
  }

  function renderHighlighted() {
    const parts = value.split(/(@\w+|#\w+)/g)
    const nodes = parts.map((part, i) => {
      if (part.startsWith('@')) return <span key={i} className="text-indigo-400">{part}</span>
      if (part.startsWith('#')) return <span key={i} className="text-emerald-400">{part}</span>
      return <span key={i} className="text-transparent">{part}</span>
    })
    if (value.endsWith('#')) nodes.push(<span key="ghost" className="text-zinc-500">Work</span>)
    return nodes
  }

  const isDirty = value.trim().length > 0 || tags.length > 0 || starred

  function handleClear() {
    setValue(''); setTags([]); setStarred(false); setTagPickerOpen(false)
    textareaRef.current?.focus()
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submitParsed() }} className="mb-8">
      <div className={`bg-zinc-900 border rounded-xl transition-colors duration-150
        ${tagPickerOpen ? 'border-zinc-600' : 'border-zinc-800 focus-within:border-zinc-600'}`}
      >
        {/* ── Text area ── */}
        <div className="relative px-4 pt-3.5 pb-2">

          {/* Single-line syntax highlight overlay */}
          {!isMultiline && (
            <div
              aria-hidden
              className="absolute left-4 right-4 top-3.5 text-sm font-mono pointer-events-none whitespace-pre overflow-hidden"
              style={{ lineHeight: '21px' }}
            >
              {renderHighlighted()}
            </div>
          )}

          {/* Multiline gutter */}
          {isMultiline && (
            <div
              aria-hidden
              className="absolute left-4 top-3.5 flex flex-col pointer-events-none select-none"
            >
              {lines.map((line, i) => (
                <div
                  key={i}
                  style={{ height: '21px', display: 'flex', alignItems: 'center' }}
                  className={line.startsWith('\t')
                    ? 'text-indigo-400 pl-1 text-sm font-medium'
                    : 'text-zinc-400 text-base font-bold'}
                >
                  {line.startsWith('\t') ? '↳' : '•'}
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Add a task — Tab to indent as subtask, ⌘↵ to save"
            style={{ caretColor: '#818cf8', lineHeight: '21px', resize: 'none', overflow: 'hidden' }}
            className={`w-full bg-transparent outline-none text-sm font-mono placeholder-zinc-600
              ${isMultiline ? 'pl-6' : 'pl-0'}`}
          />

          {isMultiline && subtaskCount > 0 && (
            <div className="mt-1 text-[10px] text-zinc-700 font-mono select-none">
              {subtaskCount} subtask{subtaskCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* ── Tag chips ── */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap px-4 pb-2">
            {tags.map(tag => (
              <span
                key={tag}
                style={getTagStyle(tag)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={9} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Footer toolbar ── */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800">

          {/* Left actions */}
          <div className="flex items-center gap-0.5">
            {isDirty && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition-colors duration-150"
                title="Clear"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setStarred(s => !s)}
              className={`p-1.5 rounded-lg transition-colors duration-150
                ${starred ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-400'}`}
              title="Star this task"
            >
              <Star size={14} fill={starred ? 'currentColor' : 'none'} />
            </button>
            <div ref={tagAreaRef} className="relative">
              <button
                type="button"
                onClick={() => setTagPickerOpen(o => !o)}
                className={`p-1.5 rounded-lg transition-colors duration-150
                  ${tagPickerOpen || tags.length > 0
                    ? 'text-indigo-400 hover:text-indigo-300'
                    : 'text-zinc-600 hover:text-zinc-400'}`}
                title="Add tags"
              >
                <Tag size={14} />
              </button>
              {tagPickerOpen && (
                <TagPicker
                  selected={tags}
                  onChange={setTags}
                  onClose={() => setTagPickerOpen(false)}
                  placement="up"
                />
              )}
            </div>
          </div>

          {/* Send button */}
          <div className="relative group">
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex items-center justify-center w-7 h-7 rounded-lg
                         bg-emerald-600 hover:bg-emerald-500 text-white
                         disabled:opacity-35 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              <SendHorizonal size={14} />
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2.5
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-150 z-50">
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                              text-center whitespace-nowrap shadow-2xl">
                <p className="text-xs font-medium text-white mb-1.5">Send now</p>
                <span className="text-[10px] font-mono bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded-md">⌘↵</span>
              </div>
              <div className="absolute top-full right-3.5
                              border-l-4 border-r-4 border-t-4
                              border-l-transparent border-r-transparent border-t-zinc-700" />
            </div>
          </div>

        </div>
      </div>
    </form>
  )
}
