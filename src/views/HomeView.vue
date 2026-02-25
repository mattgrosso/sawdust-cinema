<template>
  <div class="home">
    <div class="hero text-center">
      <img src="@/assets/sawdust-cinema-logo.png" alt="Sawdust Cinema" class="hero-logo" />
    </div>

    <div class="container py-5 schedule-section">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h2 class="mb-0">Schedule</h2>
        <button class="btn btn-primary" @click="openModal()">Reserve Your Seats</button>
      </div>

      <div class="poster-grid">
        <div v-for="showing in schedule" :key="showing.id" class="poster-card" @click="openModal(showing.id)">
          <div class="poster-img-wrap">
            <img :src="showing.poster" :alt="showing.movie" class="poster-img" />
            <div class="poster-overlay">
              <span v-if="isFull(showing.id)" class="badge bg-danger">Squeeze in!</span>
              <span v-else-if="isAlmostFull(showing.id)" class="badge bg-warning text-dark">
                {{ spotsRemaining[showing.id] }} left
              </span>
              <span v-else class="badge bg-success">
                {{ spotsRemaining[showing.id] }} available
              </span>
            </div>
          </div>
          <div class="poster-info">
            <h5>{{ showing.movie }}</h5>
            <p>{{ showing.date }}</p>
            <p>{{ showing.time }}</p>
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
    openModal (showingId = null) {
      this.$store.commit('SET_RSVP_PRESELECT', showingId)
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

<style lang="scss" scoped>
.hero {
  background-color: #280003;
  background-image: radial-gradient(ellipse 60% 180% at 50% -20%, rgba(176, 9, 14, 0.9) 0%, rgba(40, 0, 3, 0) 70%);
  background-size: 25% 100%;
  background-repeat: repeat-x;
  background-position: 50% 0;
  color: #fff;

  .hero-logo {
    max-width: 320px;
    width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
}

.schedule-section {
  background-color: #280003;
  border-radius: 0;
}

h2 {
  color: #fff;
}

.poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 2rem;
}

.poster-card {
  cursor: pointer;

  .poster-img-wrap {
    position: relative;
    /* black outer frame, then white mat, then image */
    border: 8px solid #111;
    padding: 12px;
    background-color: #fff;
    box-shadow: 0 0 18px 4px rgba(176, 9, 14, 0.35);
    transition: transform 0.15s, box-shadow 0.15s;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 0 28px 8px rgba(176, 9, 14, 0.55);
    }

    .poster-img {
      width: 100%;
      display: block;
      aspect-ratio: 2/3;
      object-fit: cover;
    }

    .poster-overlay {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
    }
  }

  .poster-info {
    margin-top: 0.75rem;

    h5 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.15rem;
    }

    p {
      font-size: 0.8rem;
      color: #e03040;
      margin: 0;
      line-height: 1.4;
    }
  }
}
</style>
