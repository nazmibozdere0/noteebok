'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle2, Circle, Plus } from 'lucide-react'
import { localDateISO, offsetLocalDate } from '@/lib/hygiene'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewTask {
  id: number
  text: string
  tags: string[]
  done: boolean
  completing: boolean
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  urgent: 'bg-rose-950/60 text-rose-300',
  Hard:   'bg-amber-950/60 text-amber-300',
  '@me':  'bg-indigo-950/60 text-indigo-300',
}

function TagPill({ label }: { label: string }) {
  const cls     = TAG_COLORS[label] ?? 'bg-zinc-700/40 text-zinc-400'
  const display = label.startsWith('@') ? label : `#${label}`
  return (
    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${cls}`}>
      {display}
    </span>
  )
}

// ─── Input text renderer — colors #tags and @mentions ────────────────────────

function InputContent({ text }: { text: string }) {
  const parts = text.split(/(#\w+|@\w+)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#')) return <span key={i} className="text-amber-400">{part}</span>
        if (part.startsWith('@')) return <span key={i} className="text-indigo-400">{part}</span>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Animation hook ───────────────────────────────────────────────────────────

const COMPLETING_MS = 650 // matches PRESS_DELAY + PRESS_DURATION from the real app

const PINNED_DONE: PreviewTask = {
  id: 0, text: 'find a cool notes app', tags: ['urgent'], done: true, completing: false,
}

function usePreviewAnimation() {
  const [inputText, setInputText] = useState('')
  const [tasks, setTasks]         = useState<PreviewTask[]>([])
  const [frozen, setFrozen]       = useState(false)

  const timer         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef      = useRef('')
  const nextId        = useRef(1)

  function cancel() { if (timer.current) clearTimeout(timer.current) }
  function after(fn: () => void, ms: number) { cancel(); timer.current = setTimeout(fn, ms) }

  // Type one character at a time toward `target`; calls `done` when reached
  function type(target: string, charMs: number, done: () => void) {
    if (inputRef.current === target) { done(); return }
    inputRef.current = target.slice(0, inputRef.current.length + 1)
    setInputText(inputRef.current)
    timer.current = setTimeout(() => type(target, charMs, done), charMs)
  }

  function addTask(text: string, tags: string[]): number {
    const id = nextId.current++
    setTasks(prev => [...prev, { id, text, tags, done: false, completing: false }])
    inputRef.current = ''
    setInputText('')
    return id
  }

  // Show green fill animation for COMPLETING_MS, then mark as done and call onDone
  function markDone(id: number, onDone: () => void) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completing: true } : t))
    completeTimer.current = setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completing: false, done: true } : t))
      onDone()
    }, COMPLETING_MS)
  }

  useEffect(() => {
    // ── Animation script ──────────────────────────────────────────────────────
    // T1: "find last week's tasks on current notes" + #Hard → submit
    // T2: "abc" → submit → complete T1 (with green fill)
    // T3: "start using noteebok" + @me → submit → complete T2 (with green fill)
    // → freeze

    timer.current = setTimeout(() => {

      // ── Task 1 ──────────────────────────────────────────────────────────────
      type("find last week's tasks on current notes", 75, () => {
        after(() => {
          type("find last week's tasks on current notes #Hard", 90, () => {
            after(() => {
              const t1 = addTask("find last week's tasks on current notes", ['Hard'])

              // ── Task 2 ──────────────────────────────────────────────────────
              after(() => {
                type('abc', 160, () => {
                  after(() => {
                    const t2 = addTask('abc', [])  // intentionally lowercase placeholder

                    // Complete T1 (green bar → done)
                    after(() => {
                      markDone(t1, () => {

                        // ── Task 3 ──────────────────────────────────────────
                        after(() => {
                          type('start using noteebok', 78, () => {
                            after(() => {
                              type('start using noteebok @me', 100, () => {
                                after(() => {
                                  addTask('start using noteebok', ['@me'])

                                  // Complete T2 (green bar → done)
                                  after(() => {
                                    markDone(t2, () => {
                                      after(() => setFrozen(true), 1000)
                                    })
                                  }, 750)

                                }, 500)
                              })
                            }, 500)
                          })
                        }, 300)

                      })
                    }, 800)

                  }, 500)
                })
              }, 700)

            }, 500)
          })
        }, 500)
      })

    }, 1000)

    return () => {
      cancel()
      if (completeTimer.current) clearTimeout(completeTimer.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allDone   = [PINNED_DONE, ...tasks.filter(t => t.done)]
  const allActive = tasks.filter(t => !t.done)

  return { inputText, allActive, allDone, frozen }
}

// ─── Preview task row ─────────────────────────────────────────────────────────

const FILL_DURATION = 650 // must match COMPLETING_MS in the hook

function PreviewTaskRow({ task }: { task: PreviewTask }) {
  const fillRef = useRef<HTMLDivElement>(null)
  const isDone  = task.done

  // Mirror the real app's rAF-based fill animation — same gradient, same timing
  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return

    if (task.completing) {
      fill.style.transition = 'none'
      fill.style.width = '0%'
      fill.style.opacity = '1'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fill.style.transition = `width ${FILL_DURATION}ms linear`
          fill.style.width = '100%'
        })
      })
    } else {
      fill.style.transition = 'none'
      fill.style.width = '0%'
      fill.style.opacity = '0'
    }
  }, [task.completing])

  return (
    <div className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg overflow-hidden animate-fade-in-up
      ${isDone ? 'opacity-50' : ''}`}
    >
      {/* Green fill — always in DOM, driven by ref (same technique as real TaskRow) */}
      <div
        ref={fillRef}
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{
          width: '0%',
          opacity: 0,
          background: 'linear-gradient(90deg, rgba(34,197,94,0.35), rgba(34,197,94,0.12))',
        }}
      />

      {/* Checkbox */}
      <div className={`flex-shrink-0 transition-colors duration-200 relative z-10
        ${isDone ? 'text-emerald-500' : 'text-zinc-600'}`}
      >
        {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
      </div>

      {/* Text + tags inline (same row) */}
      <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-0 relative z-10">
        <span className={`text-sm leading-snug transition-all duration-200
          ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}`}
        >
          {task.text}
        </span>
        {task.tags.map(tag => <TagPill key={tag} label={tag} />)}
      </div>
    </div>
  )
}

// ─── Inline SVG icons (match the real app exactly) ───────────────────────────

function IconChevronLeft() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 3 5 8 10 13" />
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 3 11 8 6 13" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="5.5" y1="1.5" x2="5.5" y2="5" />
      <line x1="10.5" y1="1.5" x2="10.5" y2="5" />
    </svg>
  )
}

function previewSubtitle(viewedDate: string, today: string): string {
  const diff = Math.round(
    (new Date(viewedDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000
  )
  if (diff === 0)  return 'Clean slate. Ship something worth it.'
  if (diff === -1) return 'Yesterday'
  if (diff === 1)  return 'Tomorrow — plan ahead'
  if (diff < 0)   return `${Math.abs(diff)} days ago`
  return `${diff} days ahead`
}

// ─── Live preview panel ───────────────────────────────────────────────────────

function PreviewPanel() {
  const today                                     = localDateISO()
  const [viewDate, setViewDate]                   = useState(today)
  const { inputText, allActive, allDone, frozen } = usePreviewAnimation()

  const isToday   = viewDate === today
  const d         = new Date(viewDate + 'T00:00:00')
  const dayLabel  = d.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div className="w-full select-none">

      {/* ── Date navigation row — matches the real app ── */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl tracking-tight whitespace-nowrap">
          <span className="font-semibold text-white">{dayLabel}</span>
          <span className="font-light text-zinc-500 ml-2.5">{dateLabel}</span>
        </h1>

        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setViewDate(d => offsetLocalDate(d, -1))}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors duration-150"
          >
            <IconChevronLeft />
          </button>
          <button
            onClick={() => setViewDate(d => offsetLocalDate(d, 1))}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors duration-150"
          >
            <IconChevronRight />
          </button>
          <button className="p-1.5 text-zinc-700 cursor-default">
            <IconCalendar />
          </button>

          <div className="w-px h-4 bg-zinc-800 mx-1" />

          <button
            onClick={() => { if (!isToday) setViewDate(today) }}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150
              ${isToday
                ? 'border-zinc-800 text-zinc-700 cursor-default'
                : 'border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer'}`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="mt-2 pl-1 mb-8">
        <p className="text-sm text-zinc-500">{previewSubtitle(viewDate, today)}</p>
      </div>

      {/* ── Task input ── */}
      <div className={`flex items-center gap-2.5 bg-zinc-900 border rounded-xl px-4 py-2.5 mb-3 transition-all duration-200
        ${inputText ? 'border-zinc-700' : 'border-zinc-800/50'}`}
      >
        <Plus size={13} className="text-zinc-600 flex-shrink-0" />
        <span className="text-sm flex-1 min-h-[20px] leading-5">
          {inputText ? (
            <span className="text-white">
              <InputContent text={inputText} />
              {!frozen && (
                <span className="inline-block w-[2px] h-3.5 bg-indigo-400 ml-px animate-blink align-middle rounded-sm" />
              )}
            </span>
          ) : (
            <span className="text-zinc-600">Add a task…</span>
          )}
        </span>
      </div>

      {/* ── Active tasks ── */}
      {allActive.length > 0 && (
        <div className="space-y-0.5 mb-4">
          {allActive.map(task => <PreviewTaskRow key={task.id} task={task} />)}
        </div>
      )}

      {/* ── Completed section ── */}
      {allDone.length > 0 && (
        <div className={allActive.length > 0 ? '' : 'mt-1'}>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-700 mb-2 pl-2">
            Completed
          </p>
          <div className="space-y-0.5">
            {allDone.map(task => <PreviewTaskRow key={task.id} task={task} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Google icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const supabase = createClient()

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black flex overflow-hidden">

      {/* ── Left: action area ─────────────────────────────────────────────────── */}
      <div className="relative w-[400px] flex-shrink-0 flex flex-col">

        {/* Brand */}
        <div className="px-10 py-7 flex-shrink-0">
          <span
            className="text-[30px] font-bold text-white tracking-tight select-none leading-none"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            noteebok
          </span>
        </div>

        {/* Auth content — centered, shifted up with pb */}
        <div className="flex-1 flex flex-col items-center justify-center px-10 pb-24">
          <div className="w-full max-w-[280px] text-center">

            <h2 className="text-2xl font-semibold text-white mb-2">
              {isSignUp ? 'Create your notebook!' : 'Welcome back!'}
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed mb-8">
              {isSignUp
                ? "Finally, a notes app you'll actually use."
                : 'Your tasks miss you. Probably.'}
            </p>

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100
                         disabled:opacity-60 disabled:cursor-not-allowed
                         text-zinc-900 text-sm font-medium rounded-xl px-4 py-3
                         transition-all duration-150 shadow-sm mb-5"
            >
              <GoogleIcon />
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <p className="text-sm text-zinc-500">
              {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
              <button
                onClick={() => setIsSignUp(v => !v)}
                className="text-zinc-200 hover:text-white underline underline-offset-2 transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: live preview ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 border-l border-zinc-800/60 bg-zinc-950/30 items-center justify-center px-8 py-12 relative overflow-hidden">

        {/* Dot-grid background */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Soft glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/[0.04] rounded-full blur-3xl pointer-events-none" />

        {/* Preview card — wider */}
        <div className="relative z-10 bg-zinc-950 border border-zinc-800/70 rounded-2xl shadow-2xl px-10 py-9 w-full max-w-[800px]">
          <PreviewPanel />
        </div>

        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-widest uppercase text-zinc-800 select-none">
          Live preview
        </p>
      </div>

    </main>
  )
}
