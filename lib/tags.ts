const TAGS_KEY = 'focus_engine_custom_tags'

export const PREDEFINED_TAGS = [
  'Work', 'Personal', 'Urgent', 'Meeting',
  'Review', 'Design', 'Dev', 'Research',
]

// Deterministic color assignment based on tag name so a tag always looks the same
const TAG_PALETTES = [
  { bg: 'bg-indigo-500/15',  text: 'text-indigo-300',  border: 'border-indigo-500/25'  },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/25' },
  { bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/25'   },
  { bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/25'    },
  { bg: 'bg-cyan-500/15',    text: 'text-cyan-300',    border: 'border-cyan-500/25'    },
  { bg: 'bg-violet-500/15',  text: 'text-violet-300',  border: 'border-violet-500/25'  },
  { bg: 'bg-orange-500/15',  text: 'text-orange-300',  border: 'border-orange-500/25'  },
  { bg: 'bg-pink-500/15',    text: 'text-pink-300',    border: 'border-pink-500/25'    },
]

export function getTagPalette(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffff
  return TAG_PALETTES[hash % TAG_PALETTES.length]
}

export function getTagClass(tag: string): string {
  const p = getTagPalette(tag)
  return `${p.bg} ${p.text} ${p.border}`
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
