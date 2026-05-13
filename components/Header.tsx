'use client'

import { RotateCcw, Settings } from 'lucide-react'

export type Tab = 'daily' | 'feed' | 'starred'

interface HeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onRetroClick: () => void
  onSettingsClick: () => void
  starredCount: number
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'daily',   label: 'Daily Management' },
  { id: 'feed',    label: 'Feed' },
  { id: 'starred', label: 'Starred Tasks' },
]

export default function Header({
  activeTab,
  onTabChange,
  onRetroClick,
  onSettingsClick,
  starredCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-900">
      <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between gap-8">

        {/* Brand */}
        <span
          className="text-xl font-bold text-white tracking-tight flex-shrink-0 select-none"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          noteebok
        </span>

        {/* Floating island nav */}
        <nav className="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-1 gap-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-4 py-1.5 rounded-xl text-sm transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {tab.label}
              {tab.id === 'starred' && starredCount > 0 && (
                <span className={`ml-1.5 text-xs tabular-nums
                  ${activeTab === 'starred' ? 'text-amber-400' : 'text-zinc-600'}`}>
                  {starredCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onRetroClick}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white
                       border border-zinc-800 hover:border-zinc-600 rounded-xl px-4 py-2
                       transition-all duration-150"
          >
            <RotateCcw size={13} />
            Weekly Retro
          </button>
          <button
            onClick={onSettingsClick}
            className="p-2 text-zinc-500 hover:text-zinc-300 border border-zinc-800
                       hover:border-zinc-600 rounded-xl transition-all duration-150"
          >
            <Settings size={14} />
          </button>
        </div>

      </div>
    </header>
  )
}
