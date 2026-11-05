// The reservations this browser made, so a guest can see and cancel them
// without an account. Each is { id, key, at }: the Firebase id of the RSVP
// and the random key the form wrote into its private half (see
// database.rules.json). The key is the only proof of ownership there is, so
// it lives here and in the confirmation email's cancel link, nowhere else.

const KEY = 'sawdust-tickets'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export const makeKey = (length = 24) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => ALPHABET[b % ALPHABET.length]).join('')

export const loadTickets = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((t) => t && t.id && t.key) : []
  } catch {
    return []
  }
}

export const saveTickets = (tickets) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(tickets.slice(-20)))
  } catch {
    // Storage blocked: the email's cancel link still works.
  }
}

export const rememberTicket = (ticket) => {
  const tickets = loadTickets().filter((t) => t.id !== ticket.id)
  tickets.push({ id: ticket.id, key: ticket.key, at: ticket.at || new Date().toISOString() })
  saveTickets(tickets)
  return tickets
}
