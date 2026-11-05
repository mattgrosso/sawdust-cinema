import { describe, it, expect } from 'vitest'
import { composeEmail } from './index.mjs'

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
