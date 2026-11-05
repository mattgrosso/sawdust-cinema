// sawdust-tickets: the confirmation email behind the RSVP form's "Email me
// a confirmation" box. One route:
//
//   POST /confirm { id, key, email, name }
//     → sends the guest their seats, an add-to-calendar link per showing,
//       an .ics attachment, and a cancel link; { ok: true } or { error }.
//
// Guests never sign in, so the Lambda proves the request is theirs the
// same way the site's cancel does: it writes the key into emailRequests/<id>
// and lets the database rules compare it with the (unreadable) private
// half. A wrong key is a 401 from Firebase and a 403 from here. The gate
// closes once `sent` is true, so each reservation gets one email.
//
// Mail goes out through Resend (RESEND_API_KEY). With no key set the route
// says so (503) before touching the gate, so nothing is burned.

import { icsFor, googleLink, whenText } from './calendar.mjs'

const DB = (process.env.DATABASE_URL || 'https://sawdust-cinema-default-rtdb.firebaseio.com').replace(/\/$/, '')
const SITE = process.env.SITE_URL || 'https://www.sawdustcinema.com'
const FROM = process.env.MAIL_FROM || 'Sawdust Cinema <tickets@sawdustcinema.com>'
const REPLY_TO = process.env.REPLY_TO || ''
// CORS is the function URL's job (scripts/deploy-api.sh sets the allowed
// origins); adding the headers here too made the browser see them twice.
const reply = (status, body) => ({ statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const readDb = async (path) => {
  const r = await fetch(`${DB}/${path}.json`)
  if (!r.ok) throw new Error(`database read ${r.status}`)
  return r.json()
}

/** The email, as a pure function of the reservation (tested). */
export const composeEmail = ({ id, key, name, showings, lines }) => {
  const cancelUrl = `${SITE}/#/cancel/${id}/${key}`
  const first = (name || '').trim().split(/\s+/)[0] || 'there'
  const seatWord = (n) => `${n} ${n === 1 ? 'seat' : 'seats'}`
  const rows = lines.map((l) => ({
    ...l,
    when: whenText(l),
    seats: seatWord(showings[l.id]),
    gcal: googleLink(l, `${seatWord(showings[l.id])} reserved for ${name}.\nCancel: ${cancelUrl}`)
  }))
  const subject = rows.length === 1
    ? `Your seats for ${rows[0].movie} at Sawdust Cinema`
    : `Your seats at Sawdust Cinema (${rows.length} screenings)`
  const text = [
    `Hi ${first},`,
    '',
    'You\'re on the list at Sawdust Cinema. Here\'s what you reserved:',
    '',
    ...rows.flatMap((r) => [`${r.movie}`, `  ${r.when} — ${r.seats}`, `  Add to Google Calendar: ${r.gcal}`, '']),
    'The calendar file attached works with Apple Calendar and Outlook.',
    '',
    `Where: Sawdust Cinema, 3804 38th St, Brentwood, MD 20722`,
    '',
    `Can't make it? Cancel here so someone else can have the seats: ${cancelUrl}`,
    '',
    'See you at the shop.'
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#280003;font-family:Avenir,Helvetica,Arial,sans-serif;color:#1e140e">
<div style="max-width:520px;margin:0 auto;background:#f5ede3;border:1px solid #d4a97a;border-radius:8px;padding:28px">
<h1 style="margin:0 0 6px;font-size:22px;color:#b0090e">You're on the list</h1>
<p style="margin:0 0 18px;color:#6c4f2e">Hi ${esc(first)}, here's what you reserved at Sawdust Cinema.</p>
${rows.map((r) => `<div style="border-top:1px solid #d4a97a;padding:14px 0">
<div style="font-weight:700;font-size:16px">${esc(r.movie)}</div>
<div style="color:#6c4f2e;margin:2px 0 8px">${esc(r.when)} &middot; ${esc(r.seats)}</div>
<a href="${esc(r.gcal)}" style="display:inline-block;padding:8px 14px;background:#b0090e;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">Add to Google Calendar</a>
</div>`).join('')}
<p style="border-top:1px solid #d4a97a;padding-top:14px;margin:0 0 12px;font-size:14px;color:#6c4f2e">The attached calendar file works with Apple Calendar and Outlook.</p>
<p style="margin:0 0 12px;font-size:14px"><strong>Where:</strong> <a href="https://maps.google.com/?q=3804+38th+St,+Brentwood,+MD+20722" style="color:#b0090e">3804 38th St, Brentwood, MD 20722</a></p>
<p style="margin:0 0 12px;font-size:14px">Can't make it? <a href="${esc(cancelUrl)}" style="color:#b0090e">Cancel your seats</a> so someone else can have them.</p>
<p style="margin:0;font-size:14px">See you at the shop.</p>
</div></body></html>`
  const ics = icsFor(rows, { uidBase: id, description: `${rows.map((r) => `${r.movie}: ${r.seats}`).join('; ')}. Cancel: ${cancelUrl}`, url: SITE })
  return { subject, text, html, ics }
}

const gate = async (id, key, value) => {
  const r = await fetch(`${DB}/emailRequests/${encodeURIComponent(id)}.json`, { method: 'PUT', body: JSON.stringify({ key, at: new Date().toISOString(), ...value }) })
  return r.status
}

const send = async ({ to, subject, text, html, ics, id }) => {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: FROM, to: [to], subject, text, html,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      headers: { 'X-Entity-Ref-ID': id },
      attachments: [{ filename: 'sawdust-cinema.ics', content: Buffer.from(ics).toString('base64'), content_type: 'text/calendar' }]
    })
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.message || body.error || `Resend ${r.status}`)
  return body.id
}

export async function handler (event) {
  const method = event.requestContext?.http?.method || 'GET'
  const path = event.rawPath || ''
  if (method !== 'POST' || !path.endsWith('/confirm')) return reply(404, { error: 'Not found' })
  if (!process.env.RESEND_API_KEY) return reply(503, { error: 'email isn\'t set up yet' })
  let body = {}
  try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : (event.body || '{}')) } catch { return reply(400, { error: 'Bad JSON' }) }
  const id = String(body.id || ''); const key = String(body.key || ''); const email = String(body.email || '').trim(); const name = String(body.name || '').trim().slice(0, 200)
  if (!/^[-\w]{10,40}$/.test(id) || !/^[a-z0-9]{16,64}$/.test(key)) return reply(400, { error: 'that reservation link is not right' })
  if (!EMAIL.test(email) || email.length > 320) return reply(400, { error: 'that email address does not look right' })

  const reservation = await readDb(`reservations/${id}`)
  if (!reservation?.showings) return reply(404, { error: 'reservation not found' })
  if (reservation.cancelledAt) return reply(409, { error: 'that reservation was cancelled' })
  const all = (await readDb('showings')) || {}
  const lines = Object.keys(reservation.showings).map((sid) => ({ id: sid, ...(all[sid] || { movie: 'A screening', isoDate: '2000-01-01', time: '7:00 PM', date: '' }) })).sort((a, b) => a.isoDate.localeCompare(b.isoDate))

  const status = await gate(id, key, {})
  if (status === 401 || status === 403) return reply(403, { error: 'that reservation link is not right, or the confirmation was already sent' })
  if (status !== 200) return reply(502, { error: `database said ${status}` })

  const mail = composeEmail({ id, key, name, showings: reservation.showings, lines })
  try {
    const sentId = await send({ to: email, ...mail, id })
    await gate(id, key, { sent: true, resendId: sentId })
    return reply(200, { ok: true })
  } catch (error) {
    console.error('send failed', error.message)
    return reply(502, { error: 'the email could not be sent' })
  }
}
