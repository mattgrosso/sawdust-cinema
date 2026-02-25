<template>
  <div class="home">
    <div class="hero text-center py-5">
      <h1 class="display-4 fw-bold">Sawdust Cinema</h1>
      <p class="lead text-muted">A private film series at the shop &mdash; summer 2025</p>
      <button class="btn btn-primary btn-lg mt-2" @click="openModal">
        Reserve Your Seats
      </button>
    </div>

    <div class="container pb-5">
      <h2 class="mb-4 mt-4">Schedule</h2>

      <div v-for="showing in schedule" :key="showing.id" class="showing-card mb-3">
        <div class="card" :class="{ 'border-danger': isFull(showing.id) }">
          <div class="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h5 class="card-title mb-1">{{ showing.movie }}</h5>
              <p class="card-text text-muted mb-0">{{ showing.date }} &bull; {{ showing.time }}</p>
            </div>
            <div class="text-end">
              <span v-if="isFull(showing.id)" class="badge bg-danger fs-6">FULL</span>
              <span v-else-if="isAlmostFull(showing.id)" class="badge bg-warning text-dark fs-6">
                {{ spotsRemaining[showing.id] }} spot{{ spotsRemaining[showing.id] === 1 ? '' : 's' }} left
              </span>
              <span v-else class="badge bg-success fs-6">
                {{ spotsRemaining[showing.id] }} spots available
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <RsvpModal />
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import RsvpModal from '@/components/RsvpModal.vue'

export default {
  name: 'HomeView',
  components: { RsvpModal },

  computed: {
    ...mapState(['schedule']),
    ...mapGetters({ spotsRemaining: 'spotsRemainingByShowing' })
  },

  methods: {
    openModal () {
      this.$store.commit('SET_RSVP_MODAL_OPEN', true)
    },
    isFull (showingId) {
      return this.spotsRemaining[showingId] <= 0
    },
    isAlmostFull (showingId) {
      return this.spotsRemaining[showingId] <= 3
    }
  },

  created () {
    this.$store.dispatch('listenForReservations')
  }
}
</script>

<style scoped>
.hero {
  background: #1a1a1a;
  color: #fff;
}
.hero .text-muted {
  color: #aaa !important;
}
.showing-card .card {
  transition: box-shadow 0.15s;
}
.showing-card .card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
</style>
