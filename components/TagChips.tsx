'use client'

import { getTagClass } from '@/lib/tags'

interface TagChipsProps {
  tags: string[]
  limit?: number
  className?: string
}

export default function TagChips({ tags, limit = 2, className = '' }: TagChipsProps) {
  if (!tags || tags.length === 0) return null

  const visible = tags.slice(0, limit)
  const hidden = tags.slice(limit)
  const overflow = hidden.length

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {visible.map(tag => (
        <span
          key={tag}
          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getTagClass(tag)}`}
        >
          {tag}
        </span>
      ))}

      {overflow > 0 && (
        // group/overflow scopes hover to this element only, avoiding conflicts with outer group
        <div className="relative group/overflow inline-flex">
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border
                           bg-zinc-800 text-zinc-400 border-zinc-700 cursor-default select-none">
            +{overflow}
          </span>

          {/* Tooltip — appears above the badge on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                          hidden group-hover/overflow:flex flex-col gap-1
                          bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 shadow-2xl
                          min-w-max pointer-events-none">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-zinc-600 mb-1">
              More tags
            </p>
            {hidden.map(tag => (
              <span
                key={tag}
                className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getTagClass(tag)}`}
              >
                {tag}
              </span>
            ))}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent
                            border-t-zinc-800" />
          </div>
        </div>
      )}
    </div>
  )
}
