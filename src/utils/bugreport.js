// In-app bug reporting, the hub-standard pattern: a small always-visible
// button, a plain textarea, and a write-only Firebase node read back by
// `yarn fetch-bug-reports`. Ported from School Hunt, 2026-11-05.

import { bugReportToken, bugReporter, DATABASE_URL } from '@/firebase'

const ENDPOINT = `${DATABASE_URL}/bugReports.json`
const STASH_KEY = 'sawdust-cinema.pendingBugReports'
const STASH_LIMIT = 10

const readStash = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STASH_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeStash = (reports) => {
  try {
    localStorage.setItem(STASH_KEY, JSON.stringify(reports.slice(-STASH_LIMIT)))
  } catch {
    // Storage full or blocked; a best-effort stash has nothing more to do.
  }
}

const describeFailure = (status, body) => {
  let detail = body?.trim() ?? ''
  try {
    detail = JSON.parse(detail)?.error ?? detail
  } catch {
    // Not JSON — the raw body is still better than nothing.
  }
  return `Bug report failed: ${status}${detail ? ` — ${detail}` : ''}`
}

const attempt = async (report, { freshToken }) => {
  const token = await bugReportToken({ fresh: freshToken })
  const response = await fetch(`${ENDPOINT}?auth=${encodeURIComponent(token)}`, {
    method: 'POST',
    body: JSON.stringify({ ...report, createdAt: { '.sv': 'timestamp' } })
  })
  if (response.ok) return
  const error = new Error(describeFailure(response.status, await response.text().catch(() => '')))
  error.status = response.status
  throw error
}

const post = async (report) => {
  try {
    await attempt(report, { freshToken: false })
  } catch (error) {
    if (error.status !== 401) throw error
    await attempt(report, { freshToken: true })
  }
}

export const flushStash = async () => {
  const stash = readStash()
  if (!stash.length || !navigator.onLine) return
  let sent = 0
  for (const report of stash) {
    try {
      await post(report)
      sent += 1
    } catch {
      break
    }
  }
  if (sent) writeStash(stash.slice(sent))
}

const MAX_TRANSCRIPT = 5000
const MAX_STATE = 10000

const clamp = (value, limit) => (value.length <= limit ? value : `${value.slice(0, limit - 1)}…`)

// `reporter` is captured at build time, not send time: a stashed report goes
// out on a later launch, and by then the session may be a different one.
export const buildReport = (transcript, state, reporter = null) => {
  const serialized = JSON.stringify(state)
  return {
    transcript: clamp(transcript, MAX_TRANSCRIPT),
    clientCreatedAt: Date.now(),
    reporterUid: reporter?.uid || null,
    reporterDisplayName: reporter?.displayName || null,
    reporterEmail: reporter?.email || null,
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screenSize: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    devicePixelRatio: window.devicePixelRatio || 1,
    online: navigator.onLine,
    state: typeof serialized === 'string' ? clamp(serialized, MAX_STATE) : undefined
  }
}

export const sendReport = async (transcript, state) => {
  // Identity is best-effort: offline with no session yet, there is nobody to
  // name, and the report must still be built so it can be stashed.
  const reporter = await bugReporter().catch(() => null)
  const report = buildReport(transcript, state, reporter)
  try {
    await post(report)
    const others = readStash().filter((stashed) => stashed.transcript !== report.transcript)
    if (others.length !== readStash().length) writeStash(others)
    flushStash()
    return 'sent'
  } catch (error) {
    const stash = readStash()
    if (!stash.some((stashed) => stashed.transcript === report.transcript)) {
      writeStash([...stash, report])
    }
    if (!navigator.onLine) return 'stashed'
    error.stashed = true
    throw error
  }
}
