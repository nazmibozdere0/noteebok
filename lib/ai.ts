import { DailyLog, RetroReport } from './types'
import { RETRO_SYSTEM_PROMPT } from './retro-prompt'

function buildPrompt(logs: DailyLog[]): string {
  const lines: string[] = ['Here are my task logs for this week:', '']

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
  if (!apiKey) throw new Error('No API key configured. Add your Gemini API key in Settings.')
  if (logs.length === 0) throw new Error('No data found for this week yet.')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: RETRO_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildPrompt(logs) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) throw new Error('Empty response from AI. Please try again.')

  return { text: text.trim() }
}
