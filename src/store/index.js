import { createStore } from 'vuex'
import { db } from '@/firebase'
import { ref, push, onValue, remove, update, set } from 'firebase/database'

export default createStore({
  state: {
    showings: {},
    reservations: {},
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

    reservationCountByShowing: (state) => {
      const counts = {}
      Object.keys(state.showings).forEach(id => { counts[id] = 0 })
      Object.values(state.reservations).forEach(reservation => {
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

    allReservations: (state) => {
      return Object.entries(state.reservations).map(([id, r]) => ({ id, ...r }))
    }
  },

  mutations: {
    SET_SHOWINGS (state, showings) {
      state.showings = showings || {}
    },
    SET_RESERVATIONS (state, reservations) {
      state.reservations = reservations || {}
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

    async submitReservation (_, { name, email, showings }) {
      await push(ref(db, 'reservations'), {
        name,
        email,
        showings,
        submittedAt: new Date().toISOString()
      })
    },

    async removeReservation (_, id) {
      await remove(ref(db, `reservations/${id}`))
    },

    async updateReservation (_, { id, name, email, showings }) {
      await update(ref(db, `reservations/${id}`), { name, email, showings })
    }
  },

  modules: {
  }
})
