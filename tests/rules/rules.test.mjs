// The security rules, exercised against the Database emulator over REST the
// way the site and the Lambda do it (no SDK, no auth): a guest reserves,
// cancels with the right key and not with a wrong one, the email gate
// closes after one send, and the private half stays unreadable.
import { describe, it, expect, beforeAll } from 'vitest'

const NS = 'sawdust-cinema-default-rtdb'
const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9014'
const url = (path, auth) => `http://${HOST}/${path}.json?ns=${NS}${auth ? `&access_token=${auth}` : ''}`
const call = async (method, path, body, auth) => {
  const r = await fetch(url(path, auth), { method, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: r.status, body: await r.json().catch(() => null) }
}
const OWNER = 'owner' // the emulator treats access_token=owner as admin

const KEY = 'abcdefghijklmnopqrstuvwx'
let id

beforeAll(async () => {
  expect((await call('PUT', '', null, OWNER)).status).toBe(200)
  await call('PUT', 'showings', { 'fri-eve': { movie: 'Pirates', date: 'Friday', isoDate: '2099-03-20', time: '7:30 PM', capacity: 15 } }, OWNER)
})

describe('reserving', () => {
  it('a guest creates both halves in one update, with a key', async () => {
    id = `r${Date.now()}`
    const r = await call('PATCH', '', { [`reservations/${id}`]: { showings: { 'fri-eve': 2 }, submittedAt: '2026-11-05T12:00:00Z' }, [`guests/${id}`]: { name: 'Pat', email: 'pat@example.com', key: KEY } })
    expect(r.status).toBe(200)
  })
  it('a short key is refused', async () => {
    const r = await call('PATCH', '', { 'reservations/short': { showings: { 'fri-eve': 1 }, submittedAt: 'x' }, 'guests/short': { name: 'P', email: 'p@x.io', key: 'tiny' } })
    expect(r.status).toBe(401)
  })
  it('nobody can read the private half', async () => {
    expect((await call('GET', `guests/${id}`)).status).toBe(401)
    expect((await call('GET', 'guests')).status).toBe(401)
    expect((await call('GET', `reservations/${id}`)).status).toBe(200)
  })
})

describe('the email gate', () => {
  it('opens for the right key, not a wrong one', async () => {
    expect((await call('PUT', `emailRequests/${id}`, { key: 'wrong-wrong-wrong-wrong', at: 'now' })).status).toBe(401)
    expect((await call('PUT', `emailRequests/${id}`, { key: KEY, at: 'now' })).status).toBe(200)
  })
  it('allows a retry until sent, then closes', async () => {
    expect((await call('PUT', `emailRequests/${id}`, { key: KEY, at: 'again' })).status).toBe(200)
    expect((await call('PUT', `emailRequests/${id}`, { key: KEY, at: 'sent', sent: true })).status).toBe(200)
    expect((await call('PUT', `emailRequests/${id}`, { key: KEY, at: 'more' })).status).toBe(401)
    expect((await call('GET', `emailRequests/${id}`)).status).toBe(401)
  })
})

describe('the owner notice gate', () => {
  it('opens once, for the right key only', async () => {
    expect((await call('PUT', `notices/${id}`, { key: 'wrong-wrong-wrong-wrong', at: 'now' })).status).toBe(401)
    expect((await call('PUT', `notices/${id}`, { key: KEY, at: 'now' })).status).toBe(200)
    expect((await call('PUT', `notices/${id}`, { key: KEY, at: 'again' })).status).toBe(401)
    expect((await call('GET', `notices/${id}`)).status).toBe(401)
  })
})

describe('cancelling', () => {
  const cancel = (key) => call('PATCH', '', { [`reservations/${id}/cancelledAt`]: '2026-11-05T13:00:00Z', [`cancellations/${id}`]: { key, at: '2026-11-05T13:00:00Z' } })
  it('is refused with a wrong key', async () => {
    expect((await cancel('nope-nope-nope-nope-nope')).status).toBe(401)
    expect((await call('GET', `reservations/${id}/cancelledAt`)).body).toBeNull()
  })
  it('is refused without the proof', async () => {
    expect((await call('PUT', `reservations/${id}/cancelledAt`, 'x')).status).toBe(401)
  })
  it('works with the right key, once', async () => {
    expect((await cancel(KEY)).status).toBe(200)
    expect((await call('GET', `reservations/${id}/cancelledAt`)).body).toBe('2026-11-05T13:00:00Z')
    expect((await cancel(KEY)).status).toBe(401)
    expect((await call('GET', `cancellations/${id}`)).status).toBe(401)
  })
  it('a stranger still cannot delete or edit the reservation', async () => {
    expect((await call('DELETE', `reservations/${id}`)).status).toBe(401)
    expect((await call('PUT', `reservations/${id}/showings/fri-eve`, 9)).status).toBe(401)
  })
})

describe('bug reports', () => {
  it('need a session; nobody reads them back', async () => {
    expect((await call('POST', 'bugReports', { transcript: 'hi' })).status).toBe(401)
    expect((await call('GET', 'bugReports')).status).toBe(401)
  })
})
