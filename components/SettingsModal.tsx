'use client'

import { useState } from 'react'
import { X, Key, Eye, EyeOff } from 'lucide-react'
import { getApiKey, saveApiKey } from '@/lib/storage'

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [key, setKey] = useState(getApiKey)
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    saveApiKey(key.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-medium text-white">Settings</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-2">
              <Key size={11} />
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="AIza…"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl
                           px-4 py-3 pr-10 text-sm text-white placeholder-zinc-600 outline-none
                           transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Stored in localStorage only — never sent anywhere except Gemini.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl
                       transition-all duration-150 font-medium"
          >
            {saved ? 'Saved ✓' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  )
}
