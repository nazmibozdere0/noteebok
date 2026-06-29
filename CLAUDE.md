@AGENTS.md

# noteebok — Project Context

Dark-mode task management app. Built by Nazmi Bozdere.

## Stack
- **Next.js 16** (Turbopack) + **Tailwind CSS v4** (`@import "tailwindcss"`) + **Supabase**
- Tailwind v4 uses `@theme` block and CSS custom properties — no `tailwind.config.js`
- Never use `@import url(...)` for fonts inside CSS files — PostCSS expands Tailwind first and the import ends up after ~1900 lines, violating CSS spec. Always use `next/font/google` instead.

## Font Stack
Loaded in `app/layout.tsx` via `next/font/google`:
- **Outfit** → `var(--font-outfit)` — brand name "noteebok" only
- **Geist** → `var(--font-geist-sans)` — UI default (`--font-ui`)
- **Geist Mono** → `var(--font-geist-mono)` — monospace (`--font-mono`)
- **Lora** → `var(--font-lora)` — display/serif (`--font-display`)

## Light / Dark Mode
- Toggled by adding/removing the `light` class on `<html>`
- `app/globals.css` has `html.light { --color-zinc-950: ...; ... }` — full zinc scale inversion
- **Never use Tailwind `dark:` prefix** — the CSS variable approach handles it globally
- Hardcoded inline styles (hex colors) must be theme-aware via a `useTheme()` hook when they depend on light/dark state

## Design Tokens
- **Accent green**: `#46d07f` (send button, active tab underline) / hover: `#5bdc8f`
- **Link color**: `#818cf8` (indigo-400 equivalent)
- **Tag badges**: `rounded-full uppercase tracking-wider font-bold px-2 py-0.5`
- Tag colors come from `getTagStyle(tag): React.CSSProperties` in `lib/tags.ts` — returns `{ backgroundColor, color }` as hex. Never use Tailwind classes for tag colors.

## Rich Text in TaskInput
`components/TaskInput.tsx` uses a `contentEditable` div (not a `<textarea>`).

**Markup formats stored in task text:**
- `[label](https://...)` — hyperlink (paste from Jira/Slack converts HTML anchors to this)
- `__text__` — underline (Cmd+U / Ctrl+U shortcut)
- `@mention`, `#tag` — extracted on save

**Key functions:**
- `serializeEditor(el)` — converts contentEditable DOM → raw text with markup
- `convertFragment(src)` — converts pasted HTML anchors → styled `<a>` elements
- Clicking links inside the editor is prevented (navigation disabled while editing)

**Keyboard shortcuts in the editor:**
- `Cmd+Enter` — submit task
- `Tab` — indent line as subtask
- `Cmd+U` — underline selection

## Rich Text Rendering in TaskList
`components/TaskList.tsx` has `renderRichText(text)` which parses stored text and returns React nodes:
- `[label](url)` → `<a>` (indigo, underline, opens in new tab)
- `https://...` or `www....` → auto-linked `<a>`
- `__text__` → `<u>`

The regex is created fresh each call (`new RegExp(RICH_RE.source, 'g')`) to avoid shared `lastIndex` state.

## Task Row Layout
- Tags in fixed right column (`min-w-[80px]`)
- Overdue fire emoji in `w-12` slot (hover-only)
- Star, Delete, `...` menu — hover-only (`opacity-0 group-hover:opacity-100`)
- `...` menu contains: branch toggle + tag editor (TagPicker)
- `overflow-hidden` must NOT be on the `...` menu container — it clips the absolutely-positioned TagPicker

## TagPicker Stability
- Use `click` (not `mousedown`) for outside-click detection — `mousedown` fires on trackpad scroll gestures
- `tagPickerOpenRef` pauses the menu's close handler while picker is open
- Pass `menuRef` as `containerRef` to TagPicker so clicks inside the full menu aren't treated as "outside"

## Press-to-Complete vs Selection
Hold threshold is 150ms (`PRESS_DELAY`). Releasing before 150ms → no selection change. Enforced via `mouseDownTime` ref in TaskList.

## Hygiene Cycle Modal
- Auto-shows **once per day** on first page load: checks `hygiene_shown_date` in localStorage
- Manual trigger available via avatar menu → "Hygiene Cycle" button (re-fetches stale tasks fresh)
- Stale threshold: 3 days (`getStaleTasks(3)`)

## Date Handling
- `localDateISO()` from `lib/hygiene` — always use this for today's date (never `new Date().toISOString()`)
- Page always initializes to today's date — no localStorage date persistence

## Supabase
- Client created via `createClient()` from `@/lib/supabase`
- Auth: Google OAuth
- Task data in `daily_logs` table
