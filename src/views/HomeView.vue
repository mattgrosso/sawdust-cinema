<template>
  <div class="home">
    <div class="hero text-center">
      <img src="@/assets/sawdust-cinema-logo.png" alt="Sawdust Cinema" class="hero-logo" />
      <a href="https://maps.google.com/?q=3804+38th+St,+Brentwood,+MD+20722" target="_blank" rel="noopener" class="hero-address">
        3804 38th St, Brentwood, MD 20722
      </a>
    </div>

    <div class="schedule-section">
      <div class="schedule-inner">

        <div class="schedule-header mb-4">
          <button v-if="upcomingByDate.length > 0" class="btn btn-primary" @click="openModal()">Reserve Your Seats</button>
          <form action="https://buttondown.com/api/emails/embed-subscribe/sawdustcinema" method="post" class="newsletter-form">
            <input type="email" name="email" placeholder="your@email.com" class="newsletter-input" required />
            <button type="submit" class="newsletter-btn">Stay in the loop</button>
          </form>
        </div>

        <template v-if="upcomingByDate.length > 0">
          <div v-for="group in upcomingByDate" :key="group.date" class="day-section">
            <h3 class="day-heading">{{ group.date }}</h3>
            <div class="poster-grid">
              <div v-for="showing in group.showings" :key="showing.id" class="poster-card" @click="openModal(showing.id)">
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
                  <p>{{ showing.time }}<span v-if="showing.runtime" class="runtime"> · {{ showing.runtime }}</span></p>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="no-upcoming">
          <p>No upcoming screenings scheduled. Check back soon.</p>
        </div>

        <details v-if="pastByDate.length > 0" class="past-screenings">
          <summary class="past-screenings-toggle">Past screenings</summary>
          <div v-for="group in pastByDate" :key="group.date" class="day-section">
            <h3 class="day-heading">{{ group.date }}</h3>
            <div class="poster-grid">
              <div v-for="showing in group.showings" :key="showing.id" class="poster-card past">
                <div class="poster-img-wrap">
                  <img :src="showing.poster" :alt="showing.movie" class="poster-img" />
                </div>
                <div class="poster-info">
                  <h5>{{ showing.movie }}</h5>
                  <p>{{ showing.time }}<span v-if="showing.runtime" class="runtime"> · {{ showing.runtime }}</span></p>
                </div>
              </div>
            </div>
          </div>
        </details>

      </div>
    </div>

    <RsvpModal />

    <footer class="site-footer">
      <span class="version-label">v{{ version }}</span>
      <router-link to="/admin" class="admin-link">admin</router-link>
    </footer>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import RsvpModal from '@/components/RsvpModal.vue'

export default {
  name: 'HomeView',
  components: { RsvpModal },

  computed: {
    version () { return process.env.VUE_APP_VERSION },
    ...mapGetters({ schedule: 'scheduleList', spotsRemaining: 'spotsRemainingByShowing' }),
    upcomingByDate () {
      return this.groupByDate(this.schedule.filter(s => s.isoDate >= this.today))
    },
    pastByDate () {
      return this.groupByDate(this.schedule.filter(s => s.isoDate < this.today)).reverse()
    },
    today () {
      return new Date().toISOString().slice(0, 10)
    }
  },

  methods: {
    groupByDate (showings) {
      const groups = []
      showings.forEach(showing => {
        const last = groups[groups.length - 1]
        if (last && last.date === showing.date) {
          last.showings.push(showing)
        } else {
          groups.push({ date: showing.date, showings: [showing] })
        }
      })
      return groups
    },
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
    this.$store.dispatch('listenForShowings')
    this.$store.dispatch('listenForReservations')
  }
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  .schedule-section {
    flex: 1;
  }
}

.hero {
  background-color: #280003;
  background-image: radial-gradient(ellipse 60% 180% at 50% -25%, rgba(176, 9, 14, 0.9) 0%, rgba(40, 0, 3, 0) 70%);
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

.schedule-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
}

h2 {
  color: #fff;
}

.day-section {
  margin-bottom: 2.5rem;
}

.day-heading {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-tan);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 1rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(212, 169, 122, 0.25);
}

.poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 2rem;
}

.site-footer {
  background-color: #280003;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.version-label {
  color: #fff;
  font-size: 0.65rem;
}

.admin-link {
  color: white;
  font-size: 0.5rem;
  text-decoration: none;

  &:hover {
    color: rgba(255, 255, 255, 0.2);
  }
}

.hero-address {
  display: block;
  color: var(--color-tan);
  font-size: 0.95rem;
  text-decoration: none;

  &:hover {
    color: #fff;
  }
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 575px) {
    flex-direction: column;
    align-items: center;

    .btn {
      width: 100%;
    }

    .newsletter-form {
      margin-left: 0;
      width: 100%;
      justify-content: center;
    }
  }
}

.newsletter-form {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
}

.newsletter-input {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
  font-size: 0.8rem;
  padding: 0.35rem 0.6rem;
  width: 180px;

  &::placeholder { color: rgba(255, 255, 255, 0.35); }
  &:focus {
    outline: none;
    border-color: var(--color-tan);
  }
}

.newsletter-btn {
  background: transparent;
  border: 1px solid rgba(212, 169, 122, 0.5);
  border-radius: 4px;
  color: var(--color-tan);
  font-size: 0.8rem;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(212, 169, 122, 0.1);
    border-color: var(--color-tan);
  }
}

.no-upcoming {
  text-align: center;
  padding: 3rem 0;
  color: var(--color-tan);
  font-size: 1rem;
}

.past-screenings {
  margin-top: 3rem;
  border-top: 1px solid rgba(212, 169, 122, 0.15);
  padding-top: 1.5rem;
}

.past-screenings-toggle {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(212, 169, 122, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  list-style: none;
  margin-bottom: 1.5rem;

  &::-webkit-details-marker { display: none; }

  &::before {
    content: '▶ ';
    font-size: 0.6rem;
  }

  details[open] > & {
    &::before { content: '▼ '; }
  }
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

  &.past {
    cursor: default;
    opacity: 0.45;
    .poster-img-wrap:hover {
      transform: none;
      box-shadow: 0 0 18px 4px rgba(176, 9, 14, 0.35);
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
