import type React from 'react'

const TAGS_KEY = 'focus_engine_custom_tags'

export const PREDEFINED_TAGS = [
  'Work', 'Personal', 'Urgent', 'Meeting',
  'Review', 'Design', 'Dev', 'Research',
]

// Deterministic color assignment based on tag name so a tag always looks the same
// Deep Muted Tones — dark backgrounds with light pastel text, no borders
const TAG_PALETTES = [
  { bg: '#312e81', text: '#a5b4fc' }, // indigo
  { bg: '#064e3b', text: '#6ee7b7' }, // emerald
  { bg: '#441a1a', text: '#fca5a5' }, // rose/coral
  { bg: '#2d2d2d', text: '#d1d5db' }, // gray
  { bg: '#1c1917', text: '#d6bcfa' }, // violet-ish
  { bg: '#1e3a5f', text: '#93c5fd' }, // blue
  { bg: '#3b1f08', text: '#fdba74' }, // orange
  { bg: '#1a1a2e', text: '#c4b5fd' }, // purple
]

export function getTagPalette(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffff
  return TAG_PALETTES[hash % TAG_PALETTES.length]
}

export function getTagStyle(tag: string): React.CSSProperties {
  const p = getTagPalette(tag)
  return { backgroundColor: p.bg, color: p.text }
}

// kept for backwards compat where callers still use className-based API
export function getTagClass(_tag: string): string {
  return ''
}

export function getCustomTags(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveCustomTag(tag: string): void {
  const existing = getCustomTags()
  if (!existing.includes(tag)) {
    localStorage.setItem(TAGS_KEY, JSON.stringify([...existing, tag]))
  }
}

export function getAllTags(): string[] {
  return [...PREDEFINED_TAGS, ...getCustomTags()]
}
