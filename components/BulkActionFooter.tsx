'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowRight, Calendar, Trash2, X } from 'lucide-react'
import CalendarPopover from './CalendarPopover'

interface BulkActionFooterProps {
  selectedCount: number
  today: string
  onComplete: () => void
  onMoveToTomorrow: () => void
  onMoveToDate: (date: string) => void
  onDelete: () => void
  onClear: () => void
}

export default function BulkActionFooter({
  selectedCount,
  today,
  onComplete,
  onMoveToTomorrow,
  onMoveToDate,
  onDelete,
  onClear,
}: BulkActionFooterProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [calOpen, setCalOpen] = useState(false)

  if (deleteConfirm) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-700 rounded-2xl px-6 py-3.5 shadow-2xl">
          <span className="text-sm text-zinc-300">
            Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?
          </span>
          <button
            onClick={() => { onDelete(); setDeleteConfirm(false) }}
            className="text-sm px-4 py-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25 transition-colors duration-150"
          >
            Delete
          </button>
          <button
            onClick={() => setDeleteConfirm(false)}
            className="text-sm px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors duration-150"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-0.5 bg-zinc-950 border border-zinc-800 rounded-2xl px-2.5 py-2.5 shadow-2xl">
        <span className="text-sm text-zinc-500 px-3 select-none whitespace-nowrap">
          {selectedCount} selected
        </span>
        <div className="w-px h-5 bg-zinc-800 mx-1" />

        <button
          onClick={onComplete}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150 whitespace-nowrap"
        >
          <CheckCircle2 size={16} />
          Complete
        </button>

        <button
          onClick={onMoveToTomorrow}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-zinc-300 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-150 whitespace-nowrap"
        >
          <ArrowRight size={16} />
          Next Day
        </button>

        <div className="relative">
          <button
            onClick={() => setCalOpen(o => !o)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all duration-150 whitespace-nowrap
              ${calOpen ? 'text-indigo-400 bg-indigo-500/15' : 'text-zinc-300 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
          >
            <Calendar size={16} />
            Move to date
          </button>
          {calOpen && (
            <CalendarPopover
              viewedDate={today}
              today={today}
              placement="up"
              onSelect={(date) => { onMoveToDate(date); setCalOpen(false) }}
              onClose={() => setCalOpen(false)}
            />
          )}
        </div>

        <button
          onClick={() => setDeleteConfirm(true)}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-zinc-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 whitespace-nowrap"
        >
          <Trash2 size={16} />
          Delete
        </button>

        <div className="w-px h-5 bg-zinc-800 mx-1" />

        <button
          onClick={onClear}
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
          title="Clear selection (Esc)"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  )
}
