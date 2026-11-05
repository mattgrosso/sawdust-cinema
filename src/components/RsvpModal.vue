<template>
  <div v-if="rsvpModalOpen" class="modal-backdrop" @click.self="close">
    <div class="modal-box">

      <!-- Success state -->
      <div v-if="submitted" class="text-center py-4">
        <div class="fs-1 mb-3">🎬</div>
        <h4>You're on the list!</h4>
        <p class="text-muted">See you at the shop.</p>
        <p v-if="emailStatus === 'sending'" class="small text-muted">
          <span class="spinner-border spinner-border-sm me-1"></span>Sending your confirmation to {{ email }}…
        </p>
        <p v-else-if="emailStatus === 'sent'" class="small email-note">
          Confirmation sent to <strong>{{ email }}</strong>, with add-to-calendar links and a link to cancel.
        </p>
        <p v-else-if="emailStatus === 'failed'" class="small text-danger">
          Your seats are reserved, but the confirmation email didn't go out ({{ emailError }}).
        </p>
        <p class="small text-muted">Need to cancel? Your reservations are listed at the top of this page.</p>
        <button class="btn btn-primary" @click="close">Close</button>
      </div>

      <!-- Form state -->
      <div v-else>
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="mb-0">Reserve Your Seats</h4>
          <button type="button" class="btn-close" @click="close"></button>
        </div>

        <form @submit.prevent="submit">
          <div class="mb-3">
            <label class="form-label fw-semibold">Your Name</label>
            <input v-model="name" type="text" class="form-control" placeholder="First and last name" required />
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold">Email</label>
            <input v-model="email" type="email" class="form-control" placeholder="you@example.com" required />
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold">Which showings?</label>
            <div v-for="showing in schedule" :key="showing.id" class="showing-row mb-2">
              <div class="d-flex align-items-center gap-2">
                <input
                  class="form-check-input flex-shrink-0"
                  type="checkbox"
                  :id="'show-' + showing.id"
                  :checked="showings[showing.id] > 0"
                  @change="toggleShowing(showing.id, $event.target.checked)"
                />
                <label class="form-check-label flex-grow-1" :for="'show-' + showing.id">
                  <strong>{{ showing.movie }}</strong>
                  <span class="text-muted ms-2 small">{{ showing.date }} &bull; {{ showing.time }}</span>
                  <span v-if="isFull(showing.id)" class="badge bg-danger ms-2">Squeeze in!</span>
                  <span v-else-if="isAlmostFull(showing.id)" class="badge bg-warning text-dark ms-2">
                    {{ spotsRemaining[showing.id] }} left
                  </span>
                </label>
                <div v-if="showings[showing.id] > 0" class="seat-count d-flex align-items-center gap-1">
                  <button type="button" class="seat-btn" @click="adjustSeats(showing.id, -1)">−</button>
                  <span class="seat-num">{{ showings[showing.id] }}</span>
                  <button type="button" class="seat-btn" @click="adjustSeats(showing.id, 1)">+</button>
                </div>
              </div>
              <div v-if="isFull(showing.id)" class="squeeze-note">
                Chairs are all reserved, but you're welcome to come and we'll squeeze you in!
              </div>
            </div>
            <div v-if="showingError" class="text-danger mt-2 small">Please select at least one showing.</div>
          </div>

          <div v-if="canEmail" class="form-check mb-4">
            <input v-model="wantEmail" class="form-check-input" type="checkbox" id="want-email" />
            <label class="form-check-label" for="want-email">
              Email me a confirmation <span class="text-muted small">(with add-to-calendar links and a way to cancel)</span>
            </label>
          </div>

          <div class="d-grid" style="padding-bottom: 6rem;">
            <button type="submit" class="btn btn-primary btn-lg" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
              {{ submitting ? 'Reserving...' : 'Reserve My Spot' }}
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { TICKETS_API } from '@/config'

export default {
  name: 'RsvpModal',

  data () {
    return {
      name: '',
      email: '',
      showings: {},
      submitting: false,
      submitted: false,
      showingError: false,
      wantEmail: true,
      emailStatus: '',
      emailError: ''
    }
  },

  computed: {
    ...mapState(['rsvpModalOpen', 'rsvpPreselect']),
    ...mapGetters({ allShowings: 'scheduleList', spotsRemaining: 'spotsRemainingByShowing' }),
    canEmail () { return Boolean(TICKETS_API) },
    schedule () {
      const today = new Date().toISOString().slice(0, 10)
      return this.allShowings.filter(s => s.isoDate >= today)
    }
  },

  watch: {
    rsvpModalOpen (val) {
      if (val) {
        this.reset()
        const saved = localStorage.getItem('sawdust-rsvp-user')
        if (saved) {
          const { name, email } = JSON.parse(saved)
          this.name = name || ''
          this.email = email || ''
        }
        if (this.rsvpPreselect) {
          this.showings = { [this.rsvpPreselect]: 1 }
        }
      }
    }
  },

  methods: {
    isFull (showingId) {
      return this.spotsRemaining[showingId] <= 0
    },
    isAlmostFull (showingId) {
      return this.spotsRemaining[showingId] <= 3
    },
    close () {
      this.$store.commit('SET_RSVP_MODAL_OPEN', false)
    },
    toggleShowing (showingId, checked) {
      if (checked) {
        this.showings = { ...this.showings, [showingId]: 1 }
      } else {
        const updated = { ...this.showings }
        delete updated[showingId]
        this.showings = updated
      }
    },
    adjustSeats (showingId, delta) {
      const current = this.showings[showingId] || 0
      const next = current + delta
      if (next <= 0) {
        const updated = { ...this.showings }
        delete updated[showingId]
        this.showings = updated
      } else {
        this.showings = { ...this.showings, [showingId]: next }
      }
    },
    reset () {
      this.name = ''
      this.email = ''
      this.showings = {}
      this.submitting = false
      this.submitted = false
      this.showingError = false
      this.emailStatus = ''
      this.emailError = ''
    },
    async submit () {
      this.showingError = false
      if (Object.keys(this.showings).length === 0) {
        this.showingError = true
        return
      }
      this.submitting = true
      let ticket
      try {
        ticket = await this.$store.dispatch('submitReservation', {
          name: this.name,
          email: this.email,
          showings: this.showings
        })
        localStorage.setItem('sawdust-rsvp-user', JSON.stringify({ name: this.name, email: this.email }))
        this.submitted = true
      } finally {
        this.submitting = false
      }
      // The seats are booked either way; the email is a courtesy on top, so
      // its failure is a note on the success screen, not a failed RSVP.
      if (ticket && this.wantEmail && this.canEmail) {
        this.emailStatus = 'sending'
        try {
          await this.$store.dispatch('requestConfirmation', { ...ticket, email: this.email, name: this.name })
          this.emailStatus = 'sent'
        } catch (error) {
          this.emailStatus = 'failed'
          this.emailError = error.message || 'unknown error'
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.email-note {
  color: var(--color-walnut);
}

.squeeze-note {
  font-size: 0.8rem;
  color: var(--color-walnut);
  padding-left: 1.8rem;
  margin-top: 0.2rem;
}

.seat-count {
  white-space: nowrap;
}

.seat-btn {
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid var(--color-tan);
  background: transparent;
  border-radius: 4px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-espresso);

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:not(:disabled):hover {
    background-color: var(--color-tan);
  }
}

.seat-num {
  min-width: 1.4rem;
  text-align: center;
  font-weight: 700;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(42, 42, 42, 0.65);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1050;
  padding: 2rem 1rem;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;

  .modal-box {
    background: var(--color-parchment);
    border-radius: 8px;
    padding: 2rem;
    width: 100%;
    max-width: 520px;
    border: 1px solid var(--color-tan);
    flex-shrink: 0;
    margin: auto 0;
  }
}
</style>
