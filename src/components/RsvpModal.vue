<template>
  <div v-if="rsvpModalOpen" class="modal-backdrop" @click.self="close">
    <div class="modal-box">

      <!-- Success state -->
      <div v-if="submitted" class="text-center py-4">
        <div class="fs-1 mb-3">🎬</div>
        <h4>You're on the list!</h4>
        <p class="text-muted">See you at the shop.</p>
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

          <div class="d-grid">
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

export default {
  name: 'RsvpModal',

  data () {
    return {
      name: '',
      email: '',
      showings: {},
      submitting: false,
      submitted: false,
      showingError: false
    }
  },

  computed: {
    ...mapState(['rsvpModalOpen', 'rsvpPreselect', 'schedule']),
    ...mapGetters({ spotsRemaining: 'spotsRemainingByShowing' })
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
    },
    async submit () {
      this.showingError = false
      if (Object.keys(this.showings).length === 0) {
        this.showingError = true
        return
      }
      this.submitting = true
      try {
        await this.$store.dispatch('submitReservation', {
          name: this.name,
          email: this.email,
          showings: this.showings
        })
        localStorage.setItem('sawdust-rsvp-user', JSON.stringify({ name: this.name, email: this.email }))
        this.submitted = true
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
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
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;

  .modal-box {
    background: var(--color-parchment);
    border-radius: 8px;
    padding: 2rem;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    border: 1px solid var(--color-tan);
  }
}
</style>
