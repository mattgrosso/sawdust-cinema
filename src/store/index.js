import { createStore } from 'vuex'
import { db } from '@/firebase'
import { ref, push, onValue } from 'firebase/database'
import schedule from '@/schedule'

export default createStore({
  state: {
    schedule,
    reservations: {},
    rsvpModalOpen: false,
    rsvpPreselect: null,
    submitSuccess: false
  },

  getters: {
    reservationCountByShowing: (state) => {
      const counts = {}
      schedule.forEach(s => { counts[s.id] = 0 })
      Object.values(state.reservations).forEach(reservation => {
        if (reservation.showings) {
          Object.entries(reservation.showings).forEach(([id, seats]) => {
            if (counts[id] !== undefined) counts[id] += seats
          })
        } else if (reservation.showingIds) {
          // legacy support for old reservations without seat counts
          reservation.showingIds.forEach(id => {
            if (counts[id] !== undefined) counts[id]++
          })
        }
      })
      return counts
    },

    spotsRemainingByShowing: (_state, getters) => {
      const remaining = {}
      schedule.forEach(s => {
        remaining[s.id] = s.capacity - (getters.reservationCountByShowing[s.id] || 0)
      })
      return remaining
    },

    allReservations: (state) => {
      return Object.entries(state.reservations).map(([id, r]) => ({ id, ...r }))
    }
  },

  mutations: {
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
    listenForReservations ({ commit }) {
      const reservationsRef = ref(db, 'reservations')
      onValue(reservationsRef, (snapshot) => {
        commit('SET_RESERVATIONS', snapshot.val())
      })
    },

    async submitReservation (_, { name, email, showings }) {
      const reservationsRef = ref(db, 'reservations')
      await push(reservationsRef, {
        name,
        email,
        showings,
        submittedAt: new Date().toISOString()
      })
    }
  },

  modules: {
  }
})
