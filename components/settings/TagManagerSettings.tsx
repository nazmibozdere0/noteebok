'use client'

import type { SectionProps } from './types'

export default function TagManagerSettings({ onDirtyChange, saveSignal, cancelSignal }: SectionProps) {
  void onDirtyChange; void saveSignal; void cancelSignal
  return (
    <div>
      <h3 className="text-base font-medium text-white mb-1">Tag Manager</h3>
      <p className="text-sm text-zinc-500 mb-6">
        Create, rename, and organize your tags.
      </p>
      <div className="rounded-xl border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-600">
        Settings coming soon
      </div>
    </div>
  )
}
