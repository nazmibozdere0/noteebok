'use client'

import { useState } from 'react'
import { Zap, RotateCcw, Settings, ChevronLeft, ChevronRight, CalendarDays, Star } from 'lucide-react'
import CalendarPopover from './CalendarPopover'
import { offsetLocalDate } from '@/lib/hygiene'

interface HeaderProps {
  viewedDate: string       // YYYY-MM-DD
  today: string            // YYYY-MM-DD
  onDateChange: (date: string) => void
  onRetroClick: () => void
  onSettingsClick: () => void
  onStarredClick: () => void
  staleCount: number
  starredCount: number
}

function formatHeaderDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function getDayDiff(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function getSubtitle(viewedDate: string, today: string): string {
  const diff = getDayDiff(today, viewedDate)
  if (diff === 0) return 'Clean slate. Ship something worth it.'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow — plan ahead'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  return `${diff} days ahead`
}

export default function Header({
  viewedDate,
  today,
  onDateChange,
  onRetroClick,
  onSettingsClick,
  onStarredClick,
  staleCount,
  starredCount,
}: HeaderProps) {
  const [calOpen, setCalOpen] = useState(false)
  const isToday = viewedDate === today
  const dateLabel = formatHeaderDate(viewedDate)
  const subtitle = getSubtitle(viewedDate, today)

  return (
    <header className="flex items-start justify-between mb-12">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-indigo-400">
            Focus Engine
          </span>
        </div>

        {/* Date row with navigation */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => onDateChange(offsetLocalDate(viewedDate, -1))}
            className="p-1 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-900 transition-all duration-150"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Date label — clickable to open calendar */}
          <button
            onClick={() => setCalOpen(o => !o)}
            className="flex items-center gap-2 group"
          >
            <h1 className="w-[340px] text-3xl font-light text-white tracking-tight group-hover:text-zinc-200 transition-colors">
              {dateLabel}
            </h1>
            <CalendarDays
              size={15}
              className="text-zinc-700 group-hover:text-zinc-400 transition-colors mt-1"
            />
          </button>

          <button
            onClick={() => onDateChange(offsetLocalDate(viewedDate, 1))}
            className="p-1 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-900 transition-all duration-150"
            aria-label="Next day"
          >
            <ChevronRight size={16} />
          </button>

          {/* Calendar popover */}
          {calOpen && (
            <CalendarPopover
              viewedDate={viewedDate}
              today={today}
              onSelect={onDateChange}
              onClose={() => setCalOpen(false)}
            />
          )}
        </div>

        {/* Subtitle row */}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-zinc-500">{subtitle}</p>
          {/* Today pill — snaps back when browsing history */}
          {!isToday && (
            <button
              onClick={() => onDateChange(today)}
              className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30
                         hover:border-indigo-400/50 rounded-full px-2.5 py-0.5 transition-all duration-150"
            >
              → Today
            </button>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 mt-1">
        {staleCount > 0 && (
          <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
            {staleCount} stale {staleCount === 1 ? 'task' : 'tasks'}
          </span>
        )}
        <button
          onClick={onStarredClick}
          className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 transition-all duration-150
            ${starredCount > 0
              ? 'text-amber-400 border-amber-500/30 hover:border-amber-400/50 hover:text-amber-300'
              : 'text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}
        >
          <Star size={13} fill={starredCount > 0 ? 'currentColor' : 'none'} />
          {starredCount > 0 ? starredCount : ''}
        </button>
        <button
          onClick={onRetroClick}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 transition-all duration-150"
        >
          <RotateCcw size={14} />
          Weekly Retro
        </button>
        <button
          onClick={onSettingsClick}
          className="p-2 text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-all duration-150"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  )
}
