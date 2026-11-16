import { createStore } from 'vuex'
import { db } from '@/firebase'
import { ref, push, onValue, remove, update } from 'firebase/database'
import { loadTickets, rememberTicket, saveTickets, makeKey } from '@/utils/tickets'
import { TICKETS_API } from '@/config'

export default createStore({
  state: {
    showings: {},
    // RSVPs WITHOUT the personal details: { showings, submittedAt,
    // cancelledAt? }. Public, because the home page counts seats from it.
    // See `guests` below.
    reservations: {},
    // The personal half — { name, email, key } keyed by the SAME id.
    // Admin-only, and only ever loaded on the Admin page.
    guests: {},
    // The reservations THIS browser made: { id, key, at } (utils/tickets.js).
    tickets: loadTickets(),
    rsvpModalOpen: false,
    rsvpPreselect: null,
    submitSuccess: false
  },

  getters: {
    scheduleList: (state) => {
      const timeToMinutes = (t) => {
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
        if (!m) return 0
        let h = parseInt(m[1])
        const min = parseInt(m[2])
        const ampm = m[3].toUpperCase()
        if (ampm === 'PM' && h !== 12) h += 12
        if (ampm === 'AM' && h === 12) h = 0
        return h * 60 + min
      }
      return Object.entries(state.showings)
        .map(([id, s]) => ({ id, ...s }))
        .sort((a, b) => {
          if (a.isoDate !== b.isoDate) return a.isoDate.localeCompare(b.isoDate)
          return timeToMinutes(a.time) - timeToMinutes(b.time)
        })
    },

    // Seats taken per showing. A cancelled reservation gives its seats back.
    reservationCountByShowing: (state) => {
      const counts = {}
      Object.keys(state.showings).forEach(id => { counts[id] = 0 })
      Object.values(state.reservations).forEach(reservation => {
        if (reservation.cancelledAt) return
        if (reservation.showings) {
          Object.entries(reservation.showings).forEach(([id, seats]) => {
            if (counts[id] !== undefined) counts[id] += seats
          })
        } else if (reservation.showingIds) {
          reservation.showingIds.forEach(id => {
            if (counts[id] !== undefined) counts[id]++
          })
        }
      })
      return counts
    },

    spotsRemainingByShowing: (state, getters) => {
      const remaining = {}
      Object.entries(state.showings).forEach(([id, s]) => {
        remaining[id] = s.capacity - (getters.reservationCountByShowing[id] || 0)
      })
      return remaining
    },

    // The admin's view of an RSVP: the public half joined to the private
    // half by id. Everything downstream (the guest lists, the edit form)
    // still sees one flat object with name and email on it, so splitting the
    // storage changed nothing about how the admin screen is written.
    allReservations: (state) => {
      return Object.entries(state.reservations).map(([id, r]) => ({
        id,
        ...r,
        ...(state.guests[id] || {})
      }))
    },

    // This browser's reservations joined to the live public half, newest
    // first. One that has vanished from the database (the admin removed it)
    // is left out.
    myReservations: (state) => {
      return state.tickets
        .map((t) => ({ ...t, ...(state.reservations[t.id] || null) }))
        .filter((r) => r.showings)
        .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    }
  },

  mutations: {
    SET_SHOWINGS (state, showings) {
      state.showings = showings || {}
    },
    SET_RESERVATIONS (state, reservations) {
      state.reservations = reservations || {}
    },
    SET_GUESTS (state, guests) {
      state.guests = guests || {}
    },
    SET_TICKETS (state, tickets) {
      state.tickets = tickets
    },
    SET_RSVP_MODAL_OPEN (state, val) {
      state.rsvpModalOpen = val
    },
    SET_RSVP_PRESELECT (state, showingId) {
      state.rsvpPreselect = showingId
    },
    SET_SUBMIT_SUCCESS (state, val) {
      state.submitSuccess = val
    }
  },

  actions: {
    listenForShowings ({ commit }) {
      const showingsRef = ref(db, 'showings')
      onValue(showingsRef, (snapshot) => {
        commit('SET_SHOWINGS', snapshot.val())
      })
    },

    async addShowing (_, showing) {
      await push(ref(db, 'showings'), showing)
    },

    async updateShowing (_, { id, ...data }) {
      await update(ref(db, `showings/${id}`), data)
    },

    async deleteShowing (_, id) {
      await remove(ref(db, `showings/${id}`))
    },

    listenForReservations ({ commit }) {
      const reservationsRef = ref(db, 'reservations')
      onValue(reservationsRef, (snapshot) => {
        commit('SET_RESERVATIONS', snapshot.val())
      })
    },

    // Guest names and emails. ONLY the Admin page calls this, and only once
    // signed in — the rules refuse the read to everyone else, so calling it
    // from the public page would simply error.
    listenForGuests ({ commit }) {
      onValue(
        ref(db, 'guests'),
        (snapshot) => commit('SET_GUESTS', snapshot.val()),
        () => commit('SET_GUESTS', null)
      )
    },

    // ONE atomic multi-path write, so an RSVP can never land as a seat count
    // with no guest attached (or the reverse). The key comes from a push()
    // with no value, which allocates an id without writing anything. The
    // random `key` in the private half is what lets this browser (or the
    // email's link) cancel later; it is remembered in localStorage.
    async submitReservation ({ commit }, { name, email, showings }) {
      const id = push(ref(db, 'reservations')).key
      const key = makeKey()
      const at = new Date().toISOString()
      await update(ref(db), {
        [`reservations/${id}`]: { showings, submittedAt: at },
        [`guests/${id}`]: { name, email, key }
      })
      commit('SET_TICKETS', rememberTicket({ id, key, at }))
      return { id, key }
    },

    // A guest's own cancel: the time goes on the public half and the key
    // into cancellations/<id>, in one update; the rules compare the key with
    // guests/<id>/key and refuse the lot if it is wrong.
    async cancelReservation ({ commit, state }, { id, key }) {
      const at = new Date().toISOString()
      await update(ref(db), {
        [`reservations/${id}/cancelledAt`]: at,
        [`cancellations/${id}`]: { key, at }
      })
      if (!state.tickets.some((t) => t.id === id)) commit('SET_TICKETS', rememberTicket({ id, key, at }))
    },

    forgetTicket ({ commit, state }, id) {
      const tickets = state.tickets.filter((t) => t.id !== id)
      saveTickets(tickets)
      commit('SET_TICKETS', tickets)
    },

    // Ask the sawdust-tickets Lambda for the confirmation email. It checks
    // the key against the database itself (see api/index.mjs), so a stranger
    // with a reservation id and someone else's address gets nothing.
    async requestConfirmation (_, { id, key, email, name }) {
      if (!TICKETS_API) throw new Error('Email confirmations are not set up.')
      const response = await fetch(`${TICKETS_API}/confirm`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, key, email, name })
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `Could not send the email (${response.status}).`)
      return body
    },

    // The admin's Announce button: the Lambda sends it through Buttondown
    // after checking this sign-in can read the guest list (api/index.mjs).
    // `check` only asks how many subscribers it would reach.
    async announce (_, { idToken, subject, body, check = false }) {
      if (!TICKETS_API) throw new Error('The newsletter is not set up.')
      const response = await fetch(`${TICKETS_API}/announce`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken, subject, body, check })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `Could not send it (${response.status}).`)
      return result
    },

    // Both halves go together, or the guest list keeps a name for an RSVP
    // that no longer exists.
    async removeReservation (_, id) {
      await update(ref(db), {
        [`reservations/${id}`]: null,
        [`guests/${id}`]: null
      })
    },

    async updateReservation (_, { id, name, email, showings }) {
      await update(ref(db), {
        [`reservations/${id}/showings`]: showings,
        [`guests/${id}/name`]: name,
        [`guests/${id}/email`]: email
      })
    }
  },

  modules: {
  }
})
