<template>
  <div class="container py-5">

    <!-- Password gate -->
    <div v-if="!authenticated" class="row justify-content-center">
      <div class="col-md-4">
        <h2 class="mb-4">Admin</h2>
        <form @submit.prevent="checkPassword">
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input v-model="passwordInput" type="password" class="form-control" autofocus />
            <div v-if="wrongPassword" class="text-danger mt-2 small">Incorrect password.</div>
          </div>
          <button type="submit" class="btn btn-primary">Enter</button>
        </form>
      </div>
    </div>

    <!-- Admin content -->
    <div v-else>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="mb-0">Reservations</h2>
        <button class="btn btn-outline-secondary btn-sm" @click="authenticated = false">Lock</button>
      </div>

      <div v-for="showing in schedule" :key="showing.id" class="mb-5">
        <h5 class="border-bottom pb-2">
          {{ showing.movie }}
          <span class="text-muted fw-normal fs-6 ms-2">{{ showing.date }} &bull; {{ showing.time }}</span>
          <span class="badge ms-2" :class="badgeClass(showing.id)">
            {{ countFor(showing.id) }} / {{ showing.capacity }}
          </span>
        </h5>

        <div v-if="guestsFor(showing.id).length === 0" class="text-muted fst-italic">No reservations yet.</div>
        <table v-else class="table table-sm table-hover">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Seats</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(guest, i) in guestsFor(showing.id)" :key="guest.id">
              <td>{{ i + 1 }}</td>
              <td>{{ guest.name }}</td>
              <td>{{ guest.email }}</td>
              <td>{{ seatsFor(guest, showing.id) }}</td>
              <td class="text-muted">{{ formatDate(guest.submittedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

const ADMIN_PASSWORD = 'sawdust'

export default {
  name: 'AdminView',

  data () {
    return {
      authenticated: false,
      passwordInput: '',
      wrongPassword: false
    }
  },

  computed: {
    ...mapState(['schedule']),
    ...mapGetters(['allReservations', 'reservationCountByShowing'])
  },

  methods: {
    checkPassword () {
      if (this.passwordInput === ADMIN_PASSWORD) {
        this.authenticated = true
        this.wrongPassword = false
      } else {
        this.wrongPassword = true
      }
    },

    guestsFor (showingId) {
      return this.allReservations.filter(r =>
        (r.showings && r.showings[showingId]) ||
        (r.showingIds && r.showingIds.includes(showingId))
      )
    },

    seatsFor (guest, showingId) {
      if (guest.showings) return guest.showings[showingId] || 1
      return 1
    },

    countFor (showingId) {
      return this.reservationCountByShowing[showingId] || 0
    },

    badgeClass (showingId) {
      const showing = this.schedule.find(s => s.id === showingId)
      const count = this.countFor(showingId)
      if (count >= showing.capacity) return 'bg-danger'
      if (count >= showing.capacity - 3) return 'bg-warning text-dark'
      return 'bg-success'
    },

    formatDate (iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleString()
    }
  },

  created () {
    this.$store.dispatch('listenForReservations')
  }
}
</script>

<style lang="scss" scoped>
h2 {
  color: var(--color-espresso);
}

h5 {
  &.border-bottom {
    border-color: var(--color-tan) !important;
  }
}
</style>
