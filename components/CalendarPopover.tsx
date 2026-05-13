'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getActiveDates } from '@/lib/storage'

interface CalendarPopoverProps {
  viewedDate: string       // YYYY-MM-DD currently viewed
  today: string            // YYYY-MM-DD actual today
  onSelect: (date: string) => void
  onClose: () => void
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarPopover({ viewedDate, today, onSelect, onClose }: CalendarPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const d = new Date(viewedDate + 'T00:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    setActiveDates(getActiveDates())
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const { year, month } = cursor
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() {
    setCursor(c => {
      if (c.month === 0) return { year: c.year - 1, month: 11 }
      return { year: c.year, month: c.month - 1 }
    })
  }

  function nextMonth() {
    setCursor(c => {
      if (c.month === 11) return { year: c.year + 1, month: 0 }
      return { year: c.year, month: c.month + 1 }
    })
  }

  // Build grid: leading nulls + day numbers
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 z-50 w-72 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-zinc-200">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-zinc-600 py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = toYMD(year, month, day)
          const isToday = iso === today
          const isViewed = iso === viewedDate
          const hasData = activeDates.has(iso)

          return (
            <button
              key={i}
              onClick={() => { onSelect(iso); onClose() }}
              className={`
                relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs
                transition-all duration-100
                ${isViewed
                  ? 'bg-indigo-600 text-white font-semibold'
                  : isToday
                  ? 'bg-zinc-800 text-white font-semibold ring-1 ring-indigo-500/50'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}
              `}
            >
              {day}
              {/* Activity dot — shows this day has data without opening it */}
              {hasData && !isViewed && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full
                  ${isToday ? 'bg-indigo-400' : 'bg-zinc-500'}`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Quick-jump footer */}
      {viewedDate !== today && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <button
            onClick={() => { onSelect(today); onClose() }}
            className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 transition-colors"
          >
            Jump to today →
          </button>
        </div>
      )}
    </div>
  )
}
