'use client'

import { useEffect, useRef, useState } from 'react'
import { X, RotateCcw } from 'lucide-react'

interface ActionToastProps {
  message: string
  onUndo: () => void
  onClose: () => void
  startTimer: boolean
}

export default function ActionToast({ message, onUndo, onClose, startTimer }: ActionToastProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // barFull drives the CSS transition: false = 0%, true = 100%
  const [barFull, setBarFull] = useState(false)

  useEffect(() => {
    if (!startTimer) return

    // Auto-dismiss after 2 seconds
    const dismissTimer = setTimeout(() => onCloseRef.current(), 2000)

    // Double rAF: first frame renders the bar at 0%, second frame starts the transition to 100%.
    // Without this, the browser never sees the 0% state and skips the transition.
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarFull(true))
    })

    return () => {
      clearTimeout(dismissTimer)
      cancelAnimationFrame(rafId)
    }
  }, [startTimer])

  function handleUndo() {
    onUndo()
    onClose()
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm text-zinc-300 select-none">{message}</span>
        <button
          onClick={handleUndo}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-150 whitespace-nowrap"
        >
          <RotateCcw size={11} />
          Undo
        </button>
        <button
          onClick={onClose}
          className="ml-0.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>

      {/* Progress bar: mounts only when countdown is active, grows left→right over 2s */}
      {startTimer && (
        <div className="h-0.5 w-full">
          <div
            className="h-full bg-emerald-500"
            style={{
              width: barFull ? '100%' : '0%',
              transition: barFull ? 'width 2s linear' : 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}
