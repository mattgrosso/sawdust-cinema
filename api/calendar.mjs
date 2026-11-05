// Dates for the confirmation email: a showing is stored as a day
// (`isoDate` YYYY-MM-DD) and a clock time ('7:30 PM') at the shop in
// Brentwood, Maryland, so everything here is America/New_York. The runtime
// ('2h 23m') sets the event's length, two hours when there isn't one.

export const ZONE = 'America/New_York'
export const PLACE = 'Sawdust Cinema, 3804 38th St, Brentwood, MD 20722'

const pad = (n) => String(n).padStart(2, '0')

/** '7:30 PM' → [19, 30]; null when it doesn't parse. */
export const parseClock = (time) => {
  const m = String(time || '').match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return null
  let h = Number(m[1]); const min = Number(m[2]); const ampm = m[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return [h, min]
}

/** '2h 23m' / '1h' / '95m' → minutes; 120 when there isn't one. */
export const parseRuntime = (runtime) => {
  const s = String(runtime || '')
  const h = s.match(/(\d+)\s*h/); const m = s.match(/(\d+)\s*m/)
  const mins = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
  return mins > 0 ? mins : 120
}

/** The zone's UTC offset in minutes at a given instant (DST-aware). */
const offsetAt = (date, zone) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date)
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - date.getTime()) / 60000)
}

/** A wall-clock time in the zone → a real Date. */
export const localToDate = (isoDate, time, zone = ZONE) => {
  const [y, mo, d] = isoDate.split('-').map(Number)
  const clock = parseClock(time) || [19, 0]
  const guess = Date.UTC(y, mo - 1, d, clock[0], clock[1])
  // Two passes handle the DST change days.
  let off = offsetAt(new Date(guess), zone)
  off = offsetAt(new Date(guess - off * 60000), zone)
  return new Date(guess - off * 60000)
}

export const stampUtc = (date) => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`

/** The showing's start and end as Dates. */
export const spanOf = (showing) => {
  const start = localToDate(showing.isoDate, showing.time)
  const end = new Date(start.getTime() + parseRuntime(showing.runtime) * 60000)
  return { start, end }
}

export const googleLink = (showing, details = '') => {
  const { start, end } = spanOf(showing)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Sawdust Cinema: ${showing.movie}`,
    dates: `${stampUtc(start)}/${stampUtc(end)}`,
    location: PLACE,
    details
  })
  return `https://calendar.google.com/calendar/render?${q}`
}

const escapeIcs = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
// Long lines fold at 75 octets per RFC 5545; keep it simple at 70 chars.
const fold = (line) => { const out = []; let rest = line; while (rest.length > 70) { out.push(rest.slice(0, 70)); rest = ` ${rest.slice(70)}` } out.push(rest); return out.join('\r\n') }

/** One .ics with an event per showing, in UTC. */
export const icsFor = (showings, { uidBase, description = '', url = '' } = {}) => {
  const now = stampUtc(new Date())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sawdust Cinema//Tickets//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const showing of showings) {
    const { start, end } = spanOf(showing)
    lines.push('BEGIN:VEVENT',
      `UID:${uidBase}-${showing.id}@sawdustcinema.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${stampUtc(start)}`,
      `DTEND:${stampUtc(end)}`,
      `SUMMARY:${escapeIcs(`Sawdust Cinema: ${showing.movie}`)}`,
      `LOCATION:${escapeIcs(PLACE)}`,
      `DESCRIPTION:${escapeIcs(description)}`)
    if (url) lines.push(`URL:${url}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** 'Friday, March 20 at 7:30 PM' from the stored fields. */
export const whenText = (showing) => `${showing.date || showing.isoDate} at ${showing.time}`
