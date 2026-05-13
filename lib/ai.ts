import { DailyLog, RetroReport } from './types'

function buildPrompt(logs: DailyLog[]): string {
  const lines: string[] = [
    'You are a productivity coach analyzing a week of work logs.',
    'Respond ONLY with a valid JSON object matching this exact schema:',
    '{',
    '  "summary": "string — 2-3 sentence narrative overview",',
    '  "completionRate": number — 0-100 integer,',
    '  "stuckAreas": ["string", ...] — 2-4 items,',
    '  "collaborators": [{"name":"string","frequency":number}, ...],',
    '  "focusRecommendations": ["string", ...] — 3 actionable bullet strings',
    '}',
    '',
    'Here are the weekly logs (tasks marked [x] are done, [ ] are pending):',
    '',
  ]

  for (const log of logs) {
    lines.push(`## ${log.date}`)
    if (log.tasks.length === 0) {
      lines.push('(no tasks)')
    } else {
      for (const t of log.tasks) {
        lines.push(`- [${t.done ? 'x' : ' '}] ${t.text}`)
      }
    }
    if (log.note.trim()) lines.push(`Note: ${log.note.trim()}`)
    lines.push('')
  }

  return lines.join('\n')
}

export async function generateRetro(logs: DailyLog[], apiKey: string): Promise<RetroReport> {
  if (!apiKey) throw new Error('No API key configured. Add your Gemini API key in settings.')
  if (logs.length === 0) throw new Error('No weekly data found. Start logging tasks to generate a retro.')

  const prompt = buildPrompt(logs)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned) as RetroReport
  } catch {
    throw new Error('AI returned malformed response. Please try again.')
  }
}
