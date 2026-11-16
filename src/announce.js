// The newsletter announcement for one screening (Admin → Screenings →
// Announce). This is only the starting text: the admin page shows it in
// editable boxes, and whatever is in the boxes is what Buttondown sends.
// The body is Markdown (Buttondown's default), written the way Matt's own
// announcements read: short, the time and date, then the link.
import { SITE_URL } from './config'

export const composeAnnouncement = (showing) => {
  const movie = (showing.movie || 'A movie').trim()
  const time = (showing.time || '').replace(/\s+(AM|PM)$/i, '$1')
  const when = [time, showing.date].filter(Boolean).join(' on ')
  const lines = []
  if (showing.poster) lines.push(`![${movie}](${showing.poster})`, '')
  lines.push(`We're showing ${movie} at Sawdust Cinema.`, '')
  if (when) lines.push(`${when}.${showing.runtime ? ` (${showing.runtime})` : ''}`, '')
  lines.push(`Save your seats at [sawdustcinema.com](${SITE_URL}).`)
  return { subject: `${movie} at Sawdust Cinema`, body: lines.join('\n') }
}
