'use client'

import { getTagStyle } from '@/lib/tags'

interface TagChipsProps {
  tags: string[]
  limit?: number
  className?: string
}

function TagBadge({ tag }: { tag: string }) {
  return (
    <span
      style={getTagStyle(tag)}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-[filter] duration-150 hover:brightness-125 select-none"
    >
      {tag}
    </span>
  )
}

export default function TagChips({ tags, limit = 2, className = '' }: TagChipsProps) {
  if (!tags || tags.length === 0) return null

  const visible = tags.slice(0, limit)
  const hidden = tags.slice(limit)
  const overflow = hidden.length

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {visible.map(tag => <TagBadge key={tag} tag={tag} />)}

      {overflow > 0 && (
        <div className="relative group/overflow inline-flex">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                           bg-zinc-800 text-zinc-400 cursor-default select-none">
            +{overflow}
          </span>

          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                          hidden group-hover/overflow:flex flex-col gap-1.5
                          bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 shadow-2xl
                          min-w-max pointer-events-none">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-zinc-600 mb-0.5">
              More tags
            </p>
            {hidden.map(tag => <TagBadge key={tag} tag={tag} />)}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
          </div>
        </div>
      )}
    </div>
  )
}
