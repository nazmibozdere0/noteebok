'use client'

import { useRef, useState, useEffect } from 'react'
import { Tag, Star, X, Trash2, SendHorizonal } from 'lucide-react'
import TagPicker from './TagPicker'
import { getTagStyle } from '@/lib/tags'

interface TaskInputProps {
  onAdd: (text: string, tags: string[], starred: boolean, subtasks?: string[]) => void
}

// Serialize contenteditable DOM → raw text with [label](url) for links
function serializeEditor(el: HTMLElement): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    } else if (node instanceof HTMLElement) {
      switch (node.tagName) {
        case 'BR':
          text += '\n'
          break
        case 'DIV':
          text += (text && !text.endsWith('\n') ? '\n' : '') + serializeEditor(node)
          break
        case 'A': {
          const href = node.getAttribute('data-href') ?? node.getAttribute('href') ?? ''
          const label = node.textContent ?? ''
          text += href ? `[${label}](${href})` : label
          break
        }
        case 'U':
          text += `__${serializeEditor(node)}__`
          break
        default:
          text += serializeEditor(node)
      }
    }
  }
  return text
}

function parseLines(raw: string): { text: string; subtasks: string[] }[] {
  const groups: { text: string; subtasks: string[] }[] = []
  let current: { text: string; subtasks: string[] } | null = null
  for (const line of raw.split('\n')) {
    const indented = line.startsWith('\t')
    const text = indented ? line.slice(1).trim() : line.trim()
    if (!text) continue
    if (!indented) { current = { text, subtasks: [] }; groups.push(current) }
    else if (current) current.subtasks.push(text)
  }
  return groups
}

// Convert a DOM element's children into a DocumentFragment,
// replacing <a href> with styled link elements
function convertFragment(src: HTMLElement): DocumentFragment {
  const frag = document.createDocumentFragment()
  for (const node of Array.from(src.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      frag.appendChild(document.createTextNode(node.textContent ?? ''))
    } else if (node instanceof HTMLElement) {
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') ?? ''
        const label = node.textContent?.trim() ?? ''
        if (href.startsWith('http') && label) {
          const a = document.createElement('a')
          a.href = href
          a.setAttribute('data-href', href)
          a.textContent = label
          a.style.cssText = 'color:#818cf8;text-decoration:underline;cursor:text'
          frag.appendChild(a)
        } else {
          frag.appendChild(document.createTextNode(node.textContent ?? ''))
        }
      } else {
        frag.appendChild(convertFragment(node))
      }
    }
  }
  return frag
}

export default function TaskInput({ onAdd }: TaskInputProps) {
  const [tags, setTags] = useState<string[]>([])
  const [starred, setStarred] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const tagAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { editorRef.current?.focus() }, [])

  function syncHasContent() {
    setHasContent(!!(editorRef.current?.textContent?.trim()))
  }

  function clear() {
    if (!editorRef.current) return
    editorRef.current.innerHTML = ''
    setHasContent(false)
    setTags([])
    setStarred(false)
    setTagPickerOpen(false)
    editorRef.current.focus()
  }

  function submitParsed() {
    const raw = serializeEditor(editorRef.current!).trim()
    const groups = parseLines(raw)
    if (groups.length === 0) return
    const [first, ...rest] = groups
    onAdd(first.text, tags, starred, first.subtasks.length > 0 ? first.subtasks : undefined)
    for (const g of rest) onAdd(g.text, [], false, g.subtasks.length > 0 ? g.subtasks : undefined)
    clear()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault(); submitParsed(); return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      e.preventDefault()
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) document.execCommand('underline')
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand('insertText', false, '\t')
      syncHasContent()
      return
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const html = e.clipboardData.getData('text/html')
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const anchors = doc.querySelectorAll('a[href]')
      if (anchors.length > 0) {
        e.preventDefault()
        const sel = window.getSelection()
        if (!sel?.rangeCount) return
        const range = sel.getRangeAt(0)
        range.deleteContents()
        const frag = convertFragment(doc.body)
        range.insertNode(frag)
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
        syncHasContent()
        return
      }
    }
    // Plain text: let browser paste, then sync
    requestAnimationFrame(syncHasContent)
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    // Don't navigate when clicking links inside the editor
    if ((e.target as HTMLElement).tagName === 'A') e.preventDefault()
  }

  const isDirty = hasContent || tags.length > 0 || starred

  return (
    <form onSubmit={e => { e.preventDefault(); submitParsed() }} className="mb-8">
      <div className={`bg-zinc-900 border rounded-xl transition-colors duration-150
        ${tagPickerOpen ? 'border-zinc-600' : 'border-zinc-800 focus-within:border-zinc-600'}`}
      >
        {/* ── Editor ── */}
        <div className="px-4 pt-3.5 pb-2">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncHasContent}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleClick}
            data-placeholder="Add a task — Tab to indent as subtask, ⌘↵ to save"
            className="w-full bg-transparent outline-none text-sm font-mono text-zinc-200
                       empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600
                       empty:before:pointer-events-none"
            style={{ caretColor: '#818cf8', minHeight: '21px', lineHeight: '21px', wordBreak: 'break-word' }}
          />
        </div>

        {/* ── Tag chips ── */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap px-4 pb-2">
            {tags.map(tag => (
              <span
                key={tag}
                style={getTagStyle(tag)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={9} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Footer toolbar ── */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800">
          <div className="flex items-center gap-0.5">
            {isDirty && (
              <button
                type="button"
                onClick={clear}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition-colors duration-150"
                title="Clear"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setStarred(s => !s)}
              className={`p-1.5 rounded-lg transition-colors duration-150
                ${starred ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-400'}`}
              title="Star this task"
            >
              <Star size={14} fill={starred ? 'currentColor' : 'none'} />
            </button>
            <div ref={tagAreaRef} className="relative">
              <button
                type="button"
                onClick={() => setTagPickerOpen(o => !o)}
                className={`p-1.5 rounded-lg transition-colors duration-150
                  ${tagPickerOpen || tags.length > 0
                    ? 'text-indigo-400 hover:text-indigo-300'
                    : 'text-zinc-600 hover:text-zinc-400'}`}
                title="Add tags"
              >
                <Tag size={14} />
              </button>
              {tagPickerOpen && (
                <TagPicker
                  selected={tags}
                  onChange={setTags}
                  onClose={() => setTagPickerOpen(false)}
                  placement="up"
                />
              )}
            </div>
          </div>

          {/* Send button */}
          <div className="relative group">
            <button
              type="submit"
              disabled={!hasContent}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-white
                         disabled:opacity-35 disabled:cursor-not-allowed
                         transition-all duration-150"
              style={{ backgroundColor: '#46d07f' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5bdc8f' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#46d07f' }}
            >
              <SendHorizonal size={14} />
            </button>
            <div className="absolute bottom-full right-0 mb-2.5
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-150 z-50">
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                              text-center whitespace-nowrap shadow-2xl">
                <p className="text-xs font-medium text-white mb-1.5">Send now</p>
                <span className="text-[10px] font-mono bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded-md">⌘↵</span>
              </div>
              <div className="absolute top-full right-3.5
                              border-l-4 border-r-4 border-t-4
                              border-l-transparent border-r-transparent border-t-zinc-700" />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
