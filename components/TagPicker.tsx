'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Plus, Tag } from 'lucide-react'
import { getAllTags, saveCustomTag, getTagClass } from '@/lib/tags'

interface TagPickerProps {
  selected: string[]
  onChange: (tags: string[]) => void
  onClose: () => void
  placement?: 'up' | 'down'  // 'up' for TaskInput, 'down' for TaskRow
}

export default function TagPicker({ selected, onChange, onClose, placement = 'up' }: TagPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => { setAllTags(getAllTags()) }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = allTags.filter(t => t.toLowerCase().includes(search.toLowerCase()))
  const trimmed = search.trim()
  const canCreate = trimmed.length > 0 && !allTags.some(t => t.toLowerCase() === trimmed.toLowerCase())

  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
  }

  function createTag() {
    if (!canCreate) return
    const tag = trimmed
    saveCustomTag(tag)
    setAllTags(getAllTags())
    onChange([...selected, tag])
    setSearch('')
  }

  const positionClass = placement === 'up'
    ? 'bottom-full mb-2'
    : 'top-full mt-1'

  return (
    <div
      ref={ref}
      className={`absolute ${positionClass} left-0 z-50 w-64 bg-zinc-950 border border-zinc-800
                 rounded-xl shadow-2xl overflow-hidden`}
    >
      <div className="p-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 rounded-lg">
          <Tag size={12} className="text-zinc-500 flex-shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createTag() } }}
            placeholder="Search or create tag…"
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 outline-none"
          />
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto py-1">
        {filtered.map(tag => {
          const isSelected = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"   // prevents form submission when used inside <form>
              onClick={() => toggle(tag)}
              className="w-full flex items-center justify-between px-3 py-2
                         hover:bg-zinc-900 transition-colors duration-100"
            >
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md border ${getTagClass(tag)}`}>
                {tag}
              </span>
              {isSelected && <Check size={12} className="text-indigo-400" />}
            </button>
          )
        })}

        {filtered.length === 0 && !canCreate && (
          <p className="text-xs text-zinc-600 text-center py-4">No tags found</p>
        )}

        {canCreate && (
          <button
            type="button"
            onClick={createTag}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400
                       hover:bg-zinc-900 hover:text-zinc-200 transition-colors duration-100"
          >
            <Plus size={12} />
            Create <span className="text-white font-medium">"{trimmed}"</span>
          </button>
        )}
      </div>
    </div>
  )
}
