<template>
  <div class="cancel-wrap">
    <div class="cancel-box">
      <router-link to="/" class="back-link">← Sawdust Cinema</router-link>

      <div v-if="state === 'loading'" class="text-muted">Looking up your reservation…</div>

      <div v-else-if="state === 'missing'">
        <h4>We couldn't find that reservation.</h4>
        <p class="text-muted">It may already have been removed. If you think that's wrong, just tell us at the door.</p>
      </div>

      <div v-else-if="state === 'cancelled'">
        <div class="fs-1 mb-2">👋</div>
        <h4>Your seats are cancelled.</h4>
        <p class="text-muted">Thanks for letting us know. Hope to see you at another screening.</p>
        <router-link to="/" class="btn btn-primary">Back to the schedule</router-link>
      </div>

      <div v-else>
        <h4>Cancel your reservation?</h4>
        <div class="lines my-3">
          <div v-for="line in lines" :key="line.id">
            <strong>{{ line.movie }}</strong>
            <span class="text-muted small ms-2">{{ line.date }} &bull; {{ line.time }}</span>
            <span class="small ms-2">{{ line.seats }} {{ line.seats === 1 ? 'seat' : 'seats' }}</span>
          </div>
        </div>
        <p v-if="error" class="text-danger small">{{ error }}</p>
        <div class="d-flex gap-2">
          <button class="btn btn-primary" :disabled="busy" @click="cancel">
            <span v-if="busy" class="spinner-border spinner-border-sm me-2"></span>Yes, cancel my seats
          </button>
          <router-link to="/" class="btn btn-outline-secondary">Keep them</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// The confirmation email's cancel link: #/cancel/<id>/<key>. The key is the
// one the RSVP form wrote into the reservation's private half; the rules
// check it, so a wrong or made-up key is refused by the database itself.
export default {
  name: 'CancelView',

  data () {
    return { state: 'loading', busy: false, error: '' }
  },

  computed: {
    id () { return this.$route.params.id },
    key () { return this.$route.params.key },
    reservation () { return this.$store.state.reservations[this.id] || null },
    lines () {
      return Object.entries(this.reservation?.showings || {})
        .map(([id, seats]) => ({ id, seats, ...(this.$store.state.showings[id] || { movie: 'A screening that was removed', date: '', time: '', isoDate: '9999' }) }))
        .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
    }
  },

  watch: {
    reservation: { handler () { this.refresh() }, immediate: true },
    '$store.state.showings' () { this.refresh() }
  },

  methods: {
    refresh () {
      if (this.state === 'cancelled') return
      if (!this.loaded) return
      if (!this.reservation) this.state = 'missing'
      else if (this.reservation.cancelledAt) this.state = 'cancelled'
      else this.state = 'ready'
    },
    async cancel () {
      this.busy = true
      this.error = ''
      try {
        await this.$store.dispatch('cancelReservation', { id: this.id, key: this.key })
        this.state = 'cancelled'
      } catch (error) {
        this.error = /permission/i.test(error.message || '')
          ? 'This link doesn\'t match the reservation, so it couldn\'t be cancelled. Just tell us at the door.'
          : (error.message || 'Could not cancel.')
      } finally {
        this.busy = false
      }
    }
  },

  created () {
    this.$store.dispatch('listenForShowings')
    this.$store.dispatch('listenForReservations')
    // The listener's first snapshot may legitimately be empty; give it a
    // moment before calling the reservation missing.
    setTimeout(() => { this.loaded = true; this.refresh() }, 1500)
  }
}
</script>

<style lang="scss" scoped>
.cancel-wrap {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 1rem;
}

.cancel-box {
  background: var(--color-parchment);
  border: 1px solid var(--color-tan);
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 520px;
  color: var(--color-espresso);
}

.back-link {
  display: inline-block;
  color: var(--color-walnut);
  font-size: 0.85rem;
  text-decoration: none;
  margin-bottom: 1rem;
}
</style>
