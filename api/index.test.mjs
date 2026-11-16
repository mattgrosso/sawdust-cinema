import { describe, it, expect, afterEach } from 'vitest'
import { composeEmail, composeNotice, handler } from './index.mjs'

const lines = [
  { id: 'fri-eve', movie: 'Pirates of the Caribbean', date: 'Friday, March 20th', isoDate: '2026-03-20', time: '7:30 PM', runtime: '2h 23m' },
  { id: 'fri-late', movie: 'The Mask', date: 'Friday, March 20th', isoDate: '2026-03-20', time: '10:15 PM', runtime: '1h 41m' }
]

describe('the confirmation email', () => {
  const mail = composeEmail({ id: 'abc123', key: 'k'.repeat(24), name: 'Pat <Sawyer>', showings: { 'fri-eve': 2, 'fri-late': 1 }, lines })
  it('names the screenings and seats', () => {
    expect(mail.subject).toBe('Your seats at Sawdust Cinema (2 screenings)')
    expect(mail.text).toContain('Pirates of the Caribbean')
    expect(mail.text).toContain('Friday, March 20th at 7:30 PM — 2 seats')
    expect(mail.text).toContain('The Mask')
    expect(mail.text).toContain('10:15 PM — 1 seat')
  })
  it('carries a cancel link and calendar links', () => {
    expect(mail.text).toContain('https://www.sawdustcinema.com/#/cancel/abc123/' + 'k'.repeat(24))
    expect((mail.text.match(/calendar\.google\.com/g) || []).length).toBe(2)
    expect(mail.ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  })
  it('escapes the name in the html and greets by first name', () => {
    expect(mail.html).toContain('Hi Pat,')
    expect(mail.html).not.toContain('<Sawyer>')
    expect(mail.text).toContain('Hi Pat,')
  })
  it('uses the single-screening subject', () => {
    const one = composeEmail({ id: 'x', key: 'k'.repeat(24), name: '', showings: { 'fri-eve': 1 }, lines: [lines[0]] })
    expect(one.subject).toBe('Your seats for Pirates of the Caribbean at Sawdust Cinema')
    expect(one.text).toContain('Hi there,')
  })
})

describe('the announce route', () => {
  const call = (body) => handler({ requestContext: { http: { method: 'POST' } }, rawPath: '/announce', body: JSON.stringify(body) })
  const token = 'aaa.bbb.ccc'
  const stub = (dbOk) => {
    const sent = []
    globalThis.fetch = async (url, init = {}) => {
      if (String(url).includes('firebaseio.com')) return { ok: dbOk, status: dbOk ? 200 : 401, json: async () => ({}) }
      sent.push({ url: String(url), init })
      if (String(url).includes('/subscribers')) return { ok: true, status: 200, json: async () => ({ count: 22 }) }
      return { ok: true, status: 201, json: async () => ({ id: 'em_1', status: 'about_to_send' }) }
    }
    return sent
  }
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch; delete process.env.BUTTONDOWN_API_KEY })

  it('refuses anyone the database will not let read the guest list', async () => {
    process.env.BUTTONDOWN_API_KEY = 'k'
    const sent = stub(false)
    const r = await call({ idToken: token, subject: 's', body: 'b' })
    expect(r.statusCode).toBe(403)
    expect(sent).toHaveLength(0)
  })
  it('counts subscribers without sending on a check', async () => {
    process.env.BUTTONDOWN_API_KEY = 'k'
    const sent = stub(true)
    const r = await call({ idToken: token, check: true })
    expect(JSON.parse(r.body)).toEqual({ subscribers: 22 })
    expect(sent.some((s) => s.url.endsWith('/emails'))).toBe(false)
  })
  it('sends the admin\'s subject and body straight away', async () => {
    process.env.BUTTONDOWN_API_KEY = 'k'
    const sent = stub(true)
    const r = await call({ idToken: token, subject: 'Jaws at Sawdust Cinema', body: 'Bring a bigger boat.' })
    expect(r.statusCode).toBe(200)
    const mail = sent.find((s) => s.url.endsWith('/emails'))
    expect(mail.init.headers['X-Buttondown-Live-Dangerously']).toBe('true')
    expect(JSON.parse(mail.init.body)).toEqual({ subject: 'Jaws at Sawdust Cinema', body: 'Bring a bigger boat.', status: 'about_to_send' })
  })
  it('says so when the key is missing', async () => {
    stub(true)
    expect((await call({ idToken: token, subject: 's', body: 'b' })).statusCode).toBe(503)
  })
})

describe('the owner notice', () => {
  it('says who, how many, and how full', () => {
    const { subject, text } = composeNotice({ name: 'Pat Sawyer', email: 'pat@example.com', showings: { 'fri-eve': 2 }, lines: [{ ...lines[0], capacity: 15 }], taken: { 'fri-eve': 9 } })
    expect(subject).toBe('Pat Sawyer reserved 2 for Pirates of the Caribbean')
    expect(text).toContain('Pat Sawyer <pat@example.com> just reserved:')
    expect(text).toContain('Friday, March 20th at 7:30 PM: 2 seats (now 9/15 reserved)')
  })
})
