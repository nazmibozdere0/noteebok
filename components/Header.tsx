'use client'

import { useRef, useState, useEffect } from 'react'
import { RotateCcw, Settings, LogOut, User } from 'lucide-react'

export type Tab = 'daily' | 'feed' | 'starred'

interface AppUser {
  name: string
  email: string
  avatar: string
}

interface HeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onRetroClick: () => void
  onSettingsClick: () => void
  starredCount: number
  user: AppUser | null
  onLogout: () => void
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
  user,
  onLogout,
}: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null)
  const shimmerRef = useRef<HTMLDivElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (!headerRef.current || !shimmerRef.current) return
    const rect = headerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    shimmerRef.current.style.left = `${pct}%`
  }

  function handleMouseEnter() {
    if (!shimmerRef.current) return
    shimmerRef.current.style.opacity = '1'
  }

  function handleMouseLeave() {
    if (!shimmerRef.current) return
    shimmerRef.current.style.opacity = '0'
  }

  return (
    <header
      ref={headerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-900"
    >
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
          <AvatarMenu user={user} onSettings={onSettingsClick} onLogout={onLogout} />
        </div>

      </div>

      {/* Cursor-tracking shimmer on bottom border */}
      <div
        ref={shimmerRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '20%',
          height: '1px',
          opacity: 0,
          background: 'linear-gradient(90deg, transparent, rgba(212,212,216,0.7), transparent)',
          transition: 'opacity 200ms ease',
          pointerEvents: 'none',
        }}
      />
    </header>
  )
}

function AvatarMenu({
  user,
  onSettings,
  onLogout,
}: {
  user: AppUser | null
  onSettings: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleLogout() {
    setLoggingOut(true)
    await onLogout()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 hover:border-zinc-500 transition-colors flex-shrink-0"
      >
        {user?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <User size={14} className="text-zinc-400" />
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 z-[100]">

          {/* User info */}
          <div className="px-3 py-2.5 border-b border-zinc-800">
            <p className="text-sm text-zinc-200 font-medium truncate">{user?.name ?? '—'}</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{user?.email ?? ''}</p>
          </div>

          {/* Settings */}
          <button
            onClick={() => { onSettings(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400
                       hover:text-white hover:bg-zinc-900 transition-colors duration-100"
          >
            <Settings size={13} />
            Settings
          </button>

          {/* Log out */}
          <div className="border-t border-zinc-800 mt-1 pt-1">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400
                         hover:text-red-300 hover:bg-zinc-900 transition-colors duration-100
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={13} />
              {loggingOut ? 'Saving…' : 'Log out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
