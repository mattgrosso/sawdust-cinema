import { describe, it, expect } from 'vitest'
import { parseClock, parseRuntime, localToDate, googleLink, icsFor, stampUtc } from './calendar.mjs'

const fri = { id: 'fri-eve', movie: 'Pirates of the Caribbean: The Curse of the Black Pearl', date: 'Friday, March 20th', isoDate: '2026-03-20', time: '7:30 PM', runtime: '2h 23m' }

describe('clock and runtime', () => {
  it('reads 12-hour clocks', () => {
    expect(parseClock('7:30 PM')).toEqual([19, 30])
    expect(parseClock('12:15 AM')).toEqual([0, 15])
    expect(parseClock('12:00 PM')).toEqual([12, 0])
    expect(parseClock('soon')).toBeNull()
  })
  it('reads runtimes, two hours by default', () => {
    expect(parseRuntime('2h 23m')).toBe(143)
    expect(parseRuntime('1h')).toBe(60)
    expect(parseRuntime('95m')).toBe(95)
    expect(parseRuntime('')).toBe(120)
  })
})

describe('New York wall clock to UTC', () => {
  it('is EDT in March after the change', () => {
    expect(localToDate('2026-03-20', '7:30 PM').toISOString()).toBe('2026-03-20T23:30:00.000Z')
  })
  it('is EST in January', () => {
    expect(localToDate('2026-01-10', '7:30 PM').toISOString()).toBe('2026-01-11T00:30:00.000Z')
  })
  it('handles the DST change day itself', () => {
    expect(localToDate('2026-03-08', '7:30 PM').toISOString()).toBe('2026-03-08T23:30:00.000Z')
    expect(localToDate('2026-11-01', '7:30 PM').toISOString()).toBe('2026-11-02T00:30:00.000Z')
  })
})

describe('calendar links and files', () => {
  it('builds a Google Calendar template link with the span', () => {
    const link = googleLink(fri, 'Two seats')
    expect(link).toContain('dates=20260320T233000Z%2F20260321T015300Z')
    expect(link).toContain('Sawdust+Cinema%3A+Pirates')
    expect(link).toContain('Brentwood')
  })
  it('writes one VEVENT per showing with escaped text', () => {
    const ics = icsFor([fri, { ...fri, id: 'fri-late', movie: 'The Mask, again; really', time: '10:15 PM', runtime: '1h 41m' }], { uidBase: 'abc', description: 'Two seats\nCancel: x', url: 'https://www.sawdustcinema.com/' })
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics).toContain('UID:abc-fri-eve@sawdustcinema.com')
    expect(ics).toContain('DTSTART:20260320T233000Z')
    expect(ics).toContain('DTEND:20260321T015300Z')
    expect(ics).toContain('The Mask\\, again\; really')
    expect(ics).toContain('Two seats\\nCancel: x')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(71)
  })
  it('stamps UTC', () => {
    expect(stampUtc(new Date('2026-03-20T23:30:00Z'))).toBe('20260320T233000Z')
  })
})
