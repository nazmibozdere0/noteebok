'use client'

import { useEffect, useRef } from 'react'

interface NotesScratchpadProps {
  value: string
  onChange: (value: string) => void
}

export default function NotesScratchpad({ value, onChange }: NotesScratchpadProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea to content height
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold tracking-widest uppercase text-zinc-600">
          Scratchpad
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Quick thoughts, context, reminders…"
        rows={3}
        className="w-full bg-transparent resize-none outline-none text-sm text-zinc-400
                   placeholder-zinc-700 leading-relaxed transition-colors duration-150
                   hover:text-zinc-300 focus:text-zinc-200"
      />
    </div>
  )
}
