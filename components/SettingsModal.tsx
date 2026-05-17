'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, Tags, User } from 'lucide-react'
import type { SectionProps } from './settings/types'
import GeminiSettings from './settings/GeminiSettings'
import TagManagerSettings from './settings/TagManagerSettings'
import ProfileSettings from './settings/ProfileSettings'

// ─── Section registry — add new sections here only ───────────────────────────

interface Section {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  component: React.ComponentType<SectionProps>
}

const SECTIONS: Section[] = [
  { id: 'profile', label: 'Profile',     icon: User,     component: ProfileSettings },
  { id: 'tags',    label: 'Tag Manager', icon: Tags,     component: TagManagerSettings },
  { id: 'gemini',  label: 'Gemini API',  icon: Sparkles, component: GeminiSettings },
]

// ─── Modal ────────────────────────────────────────────────────────────────────

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id)
  const [isDirty, setIsDirty] = useState(false)
  const [saveSignal, setSaveSignal] = useState(0)
  const [cancelSignal, setCancelSignal] = useState(0)

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function handleSectionChange(id: string) {
    setActiveId(id)
    setIsDirty(false)
  }

  function handleSave() {
    setSaveSignal(s => s + 1)
    setIsDirty(false)
  }

  function handleCancel() {
    setCancelSignal(c => c + 1)
    setIsDirty(false)
  }

  const ActiveSection = SECTIONS.find(s => s.id === activeId)!.component

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} />

      <div className="relative flex w-full max-w-3xl h-[540px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Left sidebar ── */}
        <div className="w-52 flex-shrink-0 border-r border-zinc-800/60 py-5 flex flex-col">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 px-5 mb-3">
            Settings
          </p>
          <nav className="flex-1 px-2 space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSectionChange(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left
                  ${activeId === id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
              >
                <Icon size={14} className="flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top bar with close button */}
          <div className="flex items-center justify-end px-6 pt-5 pb-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <ActiveSection
              onDirtyChange={setIsDirty}
              saveSignal={saveSignal}
              cancelSignal={cancelSignal}
            />
          </div>

          {/* Footer — appears only when there are unsaved changes */}
          {isDirty && (
            <div className="flex-shrink-0 border-t border-zinc-800 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={handleCancel}
                className="text-sm px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all duration-150"
              >
                Save changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
