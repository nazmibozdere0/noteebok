'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { getProfile, updateProfile, type UserProfile } from '@/lib/storage'
import type { SectionProps } from './types'

export default function ProfileSettings({ onDirtyChange, saveSignal, cancelSignal }: SectionProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [original, setOriginal] = useState({ firstName: '', lastName: '' })
  const [toast, setToast] = useState<'success' | 'error' | null>(null)
  const [toastError, setToastError] = useState('')

  useEffect(() => {
    getProfile().then(p => {
      setProfile(p)
      setFirstName(p.firstName)
      setLastName(p.lastName)
      setOriginal({ firstName: p.firstName, lastName: p.lastName })
    })
  }, [])

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!profile) return
    onDirtyChange(firstName !== original.firstName || lastName !== original.lastName)
  }, [firstName, lastName, original, profile, onDirtyChange])

  useEffect(() => {
    if (saveSignal === 0) return
    updateProfile(firstName, lastName)
      .then(() => {
        setOriginal({ firstName, lastName })
        setToast('success')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setToastError(msg)
        setToast('error')
      })
  }, [saveSignal])

  useEffect(() => {
    if (cancelSignal === 0) return
    setFirstName(original.firstName)
    setLastName(original.lastName)
  }, [cancelSignal])

  if (!profile) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-32 rounded-md bg-zinc-800" />
        <div className="h-10 rounded-xl bg-zinc-800" />
        <div className="h-10 rounded-xl bg-zinc-800" />
      </div>
    )
  }

  const initials = [firstName, lastName]
    .filter(Boolean).map(s => s[0]).join('').toUpperCase()
    || profile.email[0]?.toUpperCase() || '?'

  return (
    <>
      <div>
        <h3 className="text-base font-medium text-white mb-1">Profile</h3>
        <p className="text-sm text-zinc-500 mb-6">Manage your account details.</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover ring-1 ring-zinc-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-indigo-600/20 ring-1 ring-zinc-700 flex items-center justify-center text-lg font-semibold text-indigo-400 select-none">
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm text-zinc-300">
              {[firstName, lastName].filter(Boolean).join(' ') || 'No name set'}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{profile.email}</p>
          </div>
        </div>

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="John"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl
                         px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Doe"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl
                         px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Email — disabled with tooltip */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Email</label>
          <div className="relative group/email">
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl
                         px-4 py-2.5 text-sm text-zinc-500 outline-none cursor-not-allowed select-none"
            />
            <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700
                            text-xs text-zinc-300 whitespace-nowrap pointer-events-none
                            opacity-0 group-hover/email:opacity-100 transition-opacity duration-150">
              You cannot edit your account email.
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm
          ${toast === 'success'
            ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
            : 'bg-zinc-900 border-red-500/30 text-red-400'}`}
        >
          {toast === 'success'
            ? <><CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" /> Changes saved successfully.</>
            : <><AlertCircle size={14} className="flex-shrink-0" /> {toastError || 'Failed to save changes. Please try again.'}</>}
        </div>
      )}
    </>
  )
}
