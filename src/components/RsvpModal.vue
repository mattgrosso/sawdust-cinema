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
            <label class="form-label fw-semibold">Which showings? <span class="text-muted fw-normal">(pick any)</span></label>
            <div v-for="showing in schedule" :key="showing.id" class="form-check mb-2">
              <input
                class="form-check-input"
                type="checkbox"
                :id="'show-' + showing.id"
                :value="showing.id"
                v-model="selectedShowings"
                :disabled="isFull(showing.id)"
              />
              <label class="form-check-label" :for="'show-' + showing.id">
                <strong>{{ showing.movie }}</strong>
                <span class="text-muted ms-2">{{ showing.date }} &bull; {{ showing.time }}</span>
                <span v-if="isFull(showing.id)" class="badge bg-danger ms-2">Full</span>
                <span v-else-if="isAlmostFull(showing.id)" class="badge bg-warning text-dark ms-2">
                  {{ spotsRemaining[showing.id] }} left
                </span>
              </label>
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
      selectedShowings: [],
      submitting: false,
      submitted: false,
      showingError: false
    }
  },

  computed: {
    ...mapState(['rsvpModalOpen', 'schedule']),
    ...mapGetters({ spotsRemaining: 'spotsRemainingByShowing' })
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
      this.reset()
    },
    reset () {
      this.name = ''
      this.email = ''
      this.selectedShowings = []
      this.submitting = false
      this.submitted = false
      this.showingError = false
    },
    async submit () {
      this.showingError = false
      if (this.selectedShowings.length === 0) {
        this.showingError = true
        return
      }
      this.submitting = true
      try {
        await this.$store.dispatch('submitReservation', {
          name: this.name,
          email: this.email,
          showingIds: this.selectedShowings
        })
        this.submitted = true
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}
.modal-box {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
}
</style>
