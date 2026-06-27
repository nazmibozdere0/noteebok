'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronsRight, Calendar, Trash2, X } from 'lucide-react'
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

const BAR_BASE = `fixed bottom-8 left-1/2 -translate-x-1/2 z-50
  flex items-center gap-0 px-4 py-2.5 rounded-2xl
  border border-[#393939]
  shadow-[0_10px_15px_-3px_rgba(0,0,0,0.5)]`

const BAR_BG = { background: 'rgba(27,27,27,0.90)', backdropFilter: 'blur(14px)' }

// Matches platform-wide text-sm font-medium baseline
const BTN = `flex items-center gap-1.5 px-3 py-1.5 rounded-lg
  text-sm font-medium transition-colors duration-150 whitespace-nowrap`

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
      <div className={BAR_BASE} style={BAR_BG}>
        <span className="text-sm font-medium text-white/60 pr-4 mr-1 border-r border-[#393939] whitespace-nowrap">
          Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?
        </span>
        <div className="flex items-center gap-1 pl-3">
          <button
            onClick={() => { onDelete(); setDeleteConfirm(false) }}
            className={`${BTN} text-red-400 hover:text-red-300 hover:bg-red-500/10`}
          >
            Delete
          </button>
          <button
            onClick={() => setDeleteConfirm(false)}
            className={`${BTN} text-white/50 hover:text-white/80 hover:bg-white/5`}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={BAR_BASE} style={BAR_BG}>
      {/* Selection count */}
      <div className="flex items-center gap-1.5 pr-4 mr-2 border-r border-[#393939] select-none whitespace-nowrap">
        <span className="text-sm font-bold text-white">{selectedCount}</span>
        <span className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">Selected</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onComplete}
          className={`${BTN} text-white/70 hover:text-emerald-400 hover:bg-emerald-500/8`}
        >
          <CheckCircle2 size={15} />
          Complete
        </button>

        <button
          onClick={onMoveToTomorrow}
          className={`${BTN} text-white/70 hover:text-indigo-400 hover:bg-indigo-500/8`}
        >
          <ChevronsRight size={15} />
          Next Day
        </button>

        <div className="relative">
          <button
            onClick={() => setCalOpen(o => !o)}
            className={`${BTN} ${calOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/70 hover:text-indigo-400 hover:bg-indigo-500/8'}`}
          >
            <Calendar size={15} />
            Move to Date
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
          className={`${BTN} text-red-400/80 hover:text-red-300 hover:bg-red-500/8`}
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>

      {/* Dismiss */}
      <div className="w-px h-4 bg-[#393939] mx-2" />
      <button
        onClick={onClear}
        title="Clear selection (Esc)"
        className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors duration-150"
      >
        <X size={15} />
      </button>
    </div>
  )
}
