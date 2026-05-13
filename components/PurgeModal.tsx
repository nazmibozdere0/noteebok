'use client'

import { Task } from '@/lib/types'
import { getDayAge } from '@/lib/hygiene'
import { Flame, Archive, CheckCircle2, Trash2, X } from 'lucide-react'

interface PurgeModalProps {
  tasks: Task[]
  onAction: (taskId: string, action: 'keep' | 'done' | 'discard') => void
  onClose: () => void
}

// The Hygiene Cycle exists because "out of sight, out of mind" kills focus systems.
// Stale tasks silently erode trust in your own task list. By forcing a decision —
// Keep / Done / Discard — we ensure every item has an owner and a status.
// This is analogous to sprint grooming in Agile: regular pruning keeps the backlog
// trustworthy and the user in control rather than overwhelmed.
export default function PurgeModal({ tasks, onAction, onClose }: PurgeModalProps) {
  if (tasks.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-400" />
            <h2 className="text-base font-medium text-white">Hygiene Cycle</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          These tasks are <span className="text-amber-400">3+ days old</span> and still open.
          Decide their fate — a tidy backlog is a trustworthy backlog.
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {tasks.map(task => (
            <PurgeRow key={task.id} task={task} onAction={onAction} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PurgeRow({ task, onAction }: { task: Task; onAction: (id: string, action: 'keep' | 'done' | 'discard') => void }) {
  const age = getDayAge(task.createdAt)

  function renderText(text: string) {
    return text.split(/(@\w+)/g).map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-indigo-400">{part}</span>
      ) : <span key={i}>{part}</span>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-zinc-200 leading-relaxed flex-1">{renderText(task.text)}</p>
        <span className="text-xs text-amber-500 tabular-nums flex-shrink-0">{age}d old</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAction(task.id, 'keep')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                     bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white
                     transition-all duration-150"
        >
          <Archive size={12} />
          Keep
        </button>
        <button
          onClick={() => onAction(task.id, 'done')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                     bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20
                     border border-emerald-500/20 transition-all duration-150"
        >
          <CheckCircle2 size={12} />
          Mark Done
        </button>
        <button
          onClick={() => onAction(task.id, 'discard')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                     bg-red-500/10 text-red-400 hover:bg-red-500/20
                     border border-red-500/20 transition-all duration-150"
        >
          <Trash2 size={12} />
          Discard
        </button>
      </div>
    </div>
  )
}
