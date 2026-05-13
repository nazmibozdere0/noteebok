'use client'

import { useState } from 'react'
import { RetroReport } from '@/lib/types'
import { X, Loader2, TrendingUp, Users, Lightbulb, AlertCircle, BarChart3 } from 'lucide-react'

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

      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-medium text-white">Weekly Retrospective</h2>
            <p className="text-xs text-zinc-500 mt-0.5">AI-powered productivity health report</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {!report && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 size={32} className="text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-400 mb-2">Analyze your last 7 days of work</p>
              <p className="text-xs text-zinc-600 mb-6 max-w-xs">
                The AI will surface where you got stuck, who you collaborated with, and what to focus on next week.
              </p>
              <button
                onClick={onGenerate}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl
                           transition-all duration-150 font-medium"
              >
                Generate Report
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={24} className="text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-zinc-500">Analyzing your week…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 w-full">
                <AlertCircle size={14} className="flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={onGenerate}
                className="text-sm text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {report && <ReportView report={report} onRegenerate={onGenerate} loading={loading} />}
        </div>
      </div>
    </div>
  )
}

function ReportView({ report, onRegenerate, loading }: { report: RetroReport; onRegenerate: () => void; loading: boolean }) {
  return (
    <div className="space-y-6">
      {/* Completion rate pill */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-zinc-900 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Completion Rate</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-light text-white">{report.completionRate}%</span>
          </div>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${report.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-2">Summary</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{report.summary}</p>
      </div>

      {/* Stuck areas */}
      <Section icon={<AlertCircle size={13} />} label="Where You Got Stuck" color="text-amber-400">
        <ul className="space-y-1.5">
          {report.stuckAreas.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="text-amber-500 mt-1">·</span>
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* Collaborators */}
      {report.collaborators.length > 0 && (
        <Section icon={<Users size={13} />} label="Collaboration Frequency" color="text-indigo-400">
          <div className="flex flex-wrap gap-2">
            {report.collaborators.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-1.5">
                <span className="text-indigo-300 text-sm font-medium">@{c.name}</span>
                <span className="text-xs text-zinc-500">{c.frequency}×</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recommendations */}
      <Section icon={<Lightbulb size={13} />} label="Focus Recommendations" color="text-emerald-400">
        <ul className="space-y-2">
          {report.focusRecommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="text-emerald-500 font-medium mt-0.5">{i + 1}.</span>
              {r}
            </li>
          ))}
        </ul>
      </Section>

      <button
        onClick={onRegenerate}
        disabled={loading}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        Regenerate report
      </button>
    </div>
  )
}

function Section({ icon, label, color, children }: {
  icon: React.ReactNode
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className={`flex items-center gap-1.5 mb-3 ${color}`}>
        {icon}
        <p className="text-xs font-semibold tracking-widest uppercase">{label}</p>
      </div>
      {children}
    </div>
  )
}
