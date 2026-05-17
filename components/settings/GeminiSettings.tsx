'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Key } from 'lucide-react'
import { getApiKey, saveApiKey } from '@/lib/storage'
import type { SectionProps } from './types'

export default function GeminiSettings({ onDirtyChange, saveSignal, cancelSignal }: SectionProps) {
  const [key, setKey] = useState(getApiKey)
  const [original] = useState(getApiKey)
  const [show, setShow] = useState(false)

  useEffect(() => {
    onDirtyChange(key.trim() !== original.trim())
  }, [key, original, onDirtyChange])

  useEffect(() => {
    if (saveSignal === 0) return
    saveApiKey(key.trim())
  }, [saveSignal])

  useEffect(() => {
    if (cancelSignal === 0) return
    setKey(original)
  }, [cancelSignal])

  return (
    <div>
      <h3 className="text-base font-medium text-white mb-1">Gemini API</h3>
      <p className="text-sm text-zinc-500 mb-6">
        Configure your Gemini API key for AI-powered weekly retro reports.
      </p>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-2">
          <Key size={11} />
          API Key
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
    </div>
  )
}
