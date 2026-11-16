import { describe, it, expect } from 'vitest'
import { composeAnnouncement } from '../../src/announce.js'

describe('the newsletter announcement', () => {
  const showing = { movie: 'The Thing', date: 'Saturday, December 5th', time: '7:30 PM', runtime: '1h 49m', poster: 'https://image.tmdb.org/t/p/w342/thing.jpg' }
  it('names the movie, the time and the date, and links the site', () => {
    const { subject, body } = composeAnnouncement(showing)
    expect(subject).toBe('The Thing at Sawdust Cinema')
    expect(body).toContain('7:30PM on Saturday, December 5th. (1h 49m)')
    expect(body).toContain('[sawdustcinema.com](https://www.sawdustcinema.com)')
    expect(body.startsWith('![The Thing](https://image.tmdb.org/t/p/w342/thing.jpg)')).toBe(true)
  })
  it('leaves out what the screening does not have', () => {
    const { body } = composeAnnouncement({ movie: 'Jaws', date: 'Friday, June 5th', time: '8:00 PM' })
    expect(body).not.toContain('![')
    expect(body).not.toContain('. (')
    expect(body).toContain('8:00PM on Friday, June 5th.')
  })
})
