'use client'

import { RetroReport } from '@/lib/types'
import { X, Loader2, AlertCircle, RotateCcw } from 'lucide-react'

interface RetroModalProps {
  onGenerate: () => Promise<void>
  report: RetroReport | null
  error: string | null
  loading: boolean
  onClose: () => void
}

export default function RetroModal({ onGenerate, report, error, loading, onClose }: RetroModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl
                      max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-medium text-white">Weekly Retrospective</h2>
            <p className="text-xs text-zinc-600 mt-0.5">This week's completed and open tasks</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">

          {!report && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-400 mb-1">Ready to summarize your week</p>
              <p className="text-xs text-zinc-700 mb-6">Covers Monday through today</p>
              <button
                onClick={onGenerate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm
                           rounded-xl transition-all duration-150 font-medium"
              >
                Generate
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={20} className="text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-zinc-500">Analyzing your week…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20
                              rounded-xl px-4 py-3 w-full">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={onGenerate}
                className="text-sm text-zinc-500 hover:text-white transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {report && (
            <div>
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                {report.text}
              </pre>
              <button
                onClick={onGenerate}
                disabled={loading}
                className="flex items-center gap-1.5 mt-6 text-xs text-zinc-600
                           hover:text-zinc-400 transition-colors disabled:opacity-40"
              >
                <RotateCcw size={11} />
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
