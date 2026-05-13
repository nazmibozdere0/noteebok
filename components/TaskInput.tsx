'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Tag, Star, X, Trash2 } from 'lucide-react'
import TagPicker from './TagPicker'
import { getTagClass } from '@/lib/tags'

interface TaskInputProps {
  onAdd: (text: string, tags: string[], starred: boolean) => void
}

export default function TaskInput({ onAdd }: TaskInputProps) {
  const [value, setValue] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [starred, setStarred] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tagAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed, tags, starred)
    setValue('')
    setTags([])
    setStarred(false)
  }

  function renderHighlighted() {
    return value.split(/(@\w+)/g).map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-indigo-400">{part}</span>
      ) : (
        <span key={i} className="text-transparent">{part}</span>
      )
    )
  }

  const hasExtras = tags.length > 0
  const isDirty = value.trim().length > 0 || tags.length > 0 || starred

  function handleClear() {
    setValue('')
    setTags([])
    setStarred(false)
    setTagPickerOpen(false)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      {/* Main input row */}
      <div className="relative">
        {/* @mention ghost overlay */}
        <div
          aria-hidden
          className="absolute inset-0 flex items-center pl-4 pr-28 text-sm font-mono pointer-events-none whitespace-pre overflow-hidden"
        >
          {renderHighlighted()}
        </div>

        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Add a task… use @name to mention someone"
          className={`w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 text-sm text-white
                     placeholder-zinc-600 outline-none transition-colors duration-150 font-mono
                     caret-indigo-400 px-4 py-3.5 pr-28
                     ${hasExtras ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}`}
        />

        {/* Right-side action buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {/* Clear button — visible only when there's something to discard */}
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

          {/* Star toggle */}
          <button
            type="button"
            onClick={() => setStarred(s => !s)}
            className={`p-1.5 rounded-lg transition-colors duration-150
              ${starred
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Star this task"
          >
            <Star size={14} fill={starred ? 'currentColor' : 'none'} />
          </button>

          {/* Tag picker toggle */}
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
                placement="down"
              />
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!value.trim()}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-indigo-400 disabled:opacity-30 transition-colors duration-150"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Selected tag chips — shown below input when tags are selected */}
      {hasExtras && (
        <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 bg-zinc-900 border border-zinc-800
                        border-t-zinc-800/50 rounded-b-xl">
          {tags.map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getTagClass(tag)}`}
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
    </form>
  )
}
