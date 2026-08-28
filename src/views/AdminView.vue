<template>
  <div class="admin-wrap">
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
        <div class="d-flex align-items-center gap-3">
        <router-link to="/" class="back-link">← Home</router-link>
        <div class="admin-tabs">
          <button class="admin-tab" :class="{ active: tab === 'reservations' }" @click="tab = 'reservations'">Reservations</button>
          <button class="admin-tab" :class="{ active: tab === 'screenings' }" @click="tab = 'screenings'">Screenings</button>
        </div>
        </div>
        <button class="btn btn-outline-secondary btn-sm" @click="lock">Lock</button>
      </div>

      <!-- Reservations tab -->
      <div v-if="tab === 'reservations'">
        <div v-if="scheduleList.length === 0" class="text-muted fst-italic">No screenings defined yet.</div>
        <div v-for="showing in scheduleList" :key="showing.id" class="mb-5">
          <h5 class="border-bottom pb-2">
            {{ showing.movie }}
            <span class="text-muted fw-normal fs-6 ms-2">{{ showing.date }} &bull; {{ showing.time }}</span>
            <span class="badge ms-2" :class="badgeClass(showing.id)">
              {{ countFor(showing.id) }} / {{ showing.capacity }}
            </span>
          </h5>

          <div v-if="guestsFor(showing.id).length === 0" class="text-muted fst-italic">No reservations yet.</div>
          <div v-else>
            <table class="table table-sm table-hover">
              <thead>
                <tr>
                  <th class="col-index">#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Seats</th>
                  <th class="col-submitted">Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(guest, i) in guestsFor(showing.id)" :key="guest.id">
                  <tr v-if="editingId !== guest.id">
                    <td class="col-index">{{ i + 1 }}</td>
                    <td>{{ guest.name }}</td>
                    <td class="col-email">{{ guest.email }}</td>
                    <td>{{ seatsFor(guest, showing.id) }}</td>
                    <td class="text-muted col-submitted">{{ formatDate(guest.submittedAt) }}</td>
                    <td class="text-nowrap">
                      <button class="action-btn me-1" @click="startEdit(guest, showing.id)">Edit</button>
                      <button class="action-btn action-btn--danger" @click="removeGuest(guest.id)">Remove</button>
                    </td>
                  </tr>
                  <tr v-else class="edit-row">
                    <td class="col-index">{{ i + 1 }}</td>
                    <td><input v-model="editName" class="edit-input" /></td>
                    <td class="col-email"><input v-model="editEmail" class="edit-input" /></td>
                    <td>
                      <input v-model.number="editSeats" type="number" min="1" max="10" class="edit-input edit-input--narrow" />
                    </td>
                    <td class="text-muted col-submitted">{{ formatDate(guest.submittedAt) }}</td>
                    <td class="text-nowrap">
                      <button class="action-btn me-1" @click="saveEdit(guest.id, showing.id)">Save</button>
                      <button class="action-btn" @click="editingId = null">Cancel</button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Screenings tab -->
      <div v-if="tab === 'screenings'">

        <!-- Add / Edit form -->
        <div class="screening-form mb-5">
          <h5 class="mb-3">{{ editingShowingId ? 'Edit Screening' : 'Add Screening' }}</h5>
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Movie Title</label>
              <input v-model="form.movie" class="form-control" placeholder="e.g. The Princess Bride" @blur="onMovieBlur" />
            </div>
            <div class="col-12">
              <div v-if="searchingPosters" class="field-hint">Searching TMDB...</div>
              <div v-if="posterResults.length > 0" class="poster-results">
                <div
                  v-for="result in posterResults"
                  :key="result.id"
                  class="poster-thumb"
                  :class="{ selected: form.poster === result.posterUrl }"
                  @click="selectPoster(result)"
                  :title="result.title + (result.year ? ' (' + result.year + ')' : '')"
                >
                  <img v-if="result.posterUrl" :src="result.posterUrl" :alt="result.title" />
                  <div v-else class="poster-thumb-empty">No poster</div>
                  <div class="poster-thumb-year">{{ result.year }}</div>
                </div>
              </div>
              <div v-if="posterSearchError" class="text-danger small mt-1">{{ posterSearchError }}</div>
              <div v-if="form.poster" class="selected-movie-summary">
                <img :src="form.poster" class="selected-poster-thumb" />
                <div>
                  <div class="selected-movie-title">{{ form.movie }}</div>
                  <div class="field-hint">{{ form.runtime }}</div>
                  <button type="button" class="btn-clear-selection" @click="clearMovieSelection">Change</button>
                </div>
              </div>
            </div>
            <div class="col-sm-6">
              <label class="form-label">Date</label>
              <input type="date" :value="form.isoDate" @change="onDateChange" class="form-control" />
              <div v-if="form.date" class="field-hint mt-1">Displays as: {{ form.date }}</div>
            </div>
            <div class="col-sm-3">
              <label class="form-label">Time</label>
              <input type="time" :value="form.timeRaw" @change="onTimeChange" class="form-control" />
              <div v-if="form.time" class="field-hint mt-1">Displays as: {{ form.time }}</div>
            </div>
            <div v-if="formError" class="col-12">
              <div class="text-danger small">{{ formError }}</div>
            </div>
            <div class="col-12 d-flex gap-2">
              <button class="btn btn-primary" @click="saveShowing" :disabled="savingShowing">
                <span v-if="savingShowing" class="spinner-border spinner-border-sm me-2"></span>
                {{ editingShowingId ? 'Save Changes' : 'Add Screening' }}
              </button>
              <button v-if="editingShowingId" class="btn btn-outline-secondary" @click="cancelShowingEdit">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Existing screenings list -->
        <div v-if="scheduleList.length === 0" class="text-muted fst-italic">No screenings yet.</div>
        <div v-for="showing in scheduleList" :key="showing.id" class="showing-row-admin">
          <div class="showing-info">
            <span class="showing-movie">{{ showing.movie }}</span>
            <span class="showing-meta">{{ showing.date }} &bull; {{ showing.time }}</span>
            <span class="showing-meta">{{ countFor(showing.id) }} / {{ showing.capacity }} reserved</span>
          </div>
          <div class="showing-actions">
            <button class="action-btn me-1" @click="startShowingEdit(showing)">Edit</button>
            <button class="action-btn action-btn--danger" @click="removeShowing(showing.id)">Delete</button>
          </div>
        </div>

      </div>
    </div>

  </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

const ADMIN_PASSWORD = 'sawdust'

function ordinalDate (year, month, day) {
  const suffixes = ['th','st','nd','rd']
  const v = day % 100
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]
  const d = new Date(year, month - 1, day)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
  const monthName = d.toLocaleDateString('en-US', { month: 'long' })
  return `${weekday}, ${monthName} ${day}${suffix}`
}

function timeToRaw (display) {
  if (!display) return ''
  const m = display.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return ''
  let h = parseInt(m[1])
  const min = m[2]
  const ampm = m[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}

const emptyForm = () => ({
  movie: '',
  date: '',
  isoDate: '',
  time: '',
  timeRaw: '',
  runtime: '',
  poster: ''
})

export default {
  name: 'AdminView',

  data () {
    return {
      authenticated: localStorage.getItem('admin_auth') === 'true',
      passwordInput: '',
      wrongPassword: false,
      tab: 'reservations',
      // reservation editing
      editingId: null,
      editName: '',
      editEmail: '',
      editSeats: 1,
      // screening form
      form: emptyForm(),
      editingShowingId: null,
      savingShowing: false,
      formError: null,
      // poster search
      posterResults: [],
      searchingPosters: false,
      posterSearchError: null
    }
  },

  computed: {
    ...mapGetters(['scheduleList', 'allReservations', 'reservationCountByShowing'])
  },

  methods: {
    lock () {
      this.authenticated = false
      localStorage.removeItem('admin_auth')
    },

    checkPassword () {
      if (this.passwordInput === ADMIN_PASSWORD) {
        this.authenticated = true
        localStorage.setItem('admin_auth', 'true')
        this.wrongPassword = false
      } else {
        this.wrongPassword = true
      }
    },

    // --- Reservations ---

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
      const showing = this.scheduleList.find(s => s.id === showingId)
      const count = this.countFor(showingId)
      if (count >= showing.capacity) return 'bg-danger'
      if (count >= showing.capacity - 3) return 'bg-warning text-dark'
      return 'bg-success'
    },

    startEdit (guest, showingId) {
      this.editingId = guest.id
      this.editName = guest.name
      this.editEmail = guest.email
      this.editSeats = this.seatsFor(guest, showingId)
    },

    async saveEdit (guestId, showingId) {
      const guest = this.allReservations.find(r => r.id === guestId)
      const updatedShowings = { ...(guest.showings || {}), [showingId]: this.editSeats }
      await this.$store.dispatch('updateReservation', {
        id: guestId,
        name: this.editName,
        email: this.editEmail,
        showings: updatedShowings
      })
      this.editingId = null
    },

    async removeGuest (id) {
      if (!confirm('Remove this reservation?')) return
      await this.$store.dispatch('removeReservation', id)
    },

    formatDate (iso) {
      if (!iso) return ''
      return new Date(iso).toLocaleString()
    },

    // --- Screenings ---

    startShowingEdit (showing) {
      this.editingShowingId = showing.id
      this.form = {
        movie: showing.movie,
        date: showing.date,
        isoDate: showing.isoDate,
        time: showing.time,
        timeRaw: timeToRaw(showing.time),
        runtime: showing.runtime || '',
        poster: showing.poster || ''
      }
      this.formError = null
      this.posterResults = []
      this.posterSearchError = null
      // Set picker to existing date+time
      this.$nextTick(() => {
        if (this._picker && showing.isoDate && showing.timeRaw) {
          this._picker.setDate(`${showing.isoDate} ${showing.timeRaw}`, false)
        }
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    cancelShowingEdit () {
      this.editingShowingId = null
      this.form = emptyForm()
      this.formError = null
      this.posterResults = []
      this.posterSearchError = null
      this.form.isoDate = ''
      this.form.date = ''
      this.form.time = ''
      this.form.timeRaw = ''
    },

    onDateChange (e) {
      const val = e.target.value
      if (!val) { this.form.isoDate = ''; this.form.date = ''; return }
      this.form.isoDate = val
      const [year, month, day] = val.split('-').map(Number)
      this.form.date = ordinalDate(year, month, day)
    },

    onTimeChange (e) {
      const val = e.target.value
      this.form.timeRaw = val
      if (!val) { this.form.time = ''; return }
      const [hStr, min] = val.split(':')
      let h = parseInt(hStr)
      const ampm = h >= 12 ? 'PM' : 'AM'
      if (h > 12) h -= 12
      if (h === 0) h = 12
      this.form.time = `${h}:${min} ${ampm}`
    },

    onMovieBlur () {
      if (this.form.movie.trim()) this.searchPosters()
    },

    async searchPosters () {
      this.posterSearchError = null
      this.posterResults = []
      const apiKey = process.env.VUE_APP_TMDB_API_KEY
      if (!apiKey) {
        this.posterSearchError = 'TMDB API key not configured (VUE_APP_TMDB_API_KEY).'
        return
      }
      this.searchingPosters = true
      try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(this.form.movie.trim())}&include_adult=false`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`TMDB error ${res.status}`)
        const data = await res.json()
        this.posterResults = (data.results || []).slice(0, 8).map(m => ({
          id: m.id,
          title: m.title,
          year: m.release_date ? m.release_date.slice(0, 4) : '',
          posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null
        }))
        if (this.posterResults.length === 0) {
          this.posterSearchError = 'No results found.'
        }
      } catch (e) {
        this.posterSearchError = 'Search failed. Check your API key and try again.'
      } finally {
        this.searchingPosters = false
      }
    },

    clearMovieSelection () {
      this.form.poster = ''
      this.form.runtime = ''
      this.posterResults = []
      this.posterSearchError = null
    },

    async selectPoster (result) {
      this.form.poster = result.posterUrl
      this.form.movie = result.title
      this.posterResults = []
      const apiKey = process.env.VUE_APP_TMDB_API_KEY
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${result.id}?api_key=${apiKey}`)
        if (res.ok) {
          const data = await res.json()
          if (data.runtime) {
            const h = Math.floor(data.runtime / 60)
            const m = data.runtime % 60
            this.form.runtime = h > 0 ? `${h}h ${m}m` : `${m}m`
          }
        }
      } catch {
        // runtime stays as-is if the detail fetch fails
      }
    },

    async saveShowing () {
      this.formError = null
      const { movie, isoDate, time } = this.form
      if (!movie.trim() || !isoDate.trim() || !time.trim()) {
        this.formError = 'Movie, date, and time are required.'
        return
      }
      this.savingShowing = true
      try {
        const data = {
          movie: movie.trim(),
          date: this.form.date.trim(),
          isoDate: isoDate.trim(),
          time: time.trim(),
          runtime: this.form.runtime.trim(),
          capacity: 15,
          poster: this.form.poster.trim()
        }
        if (this.editingShowingId) {
          await this.$store.dispatch('updateShowing', { id: this.editingShowingId, ...data })
        } else {
          await this.$store.dispatch('addShowing', data)
        }
        this.editingShowingId = null
        this.form = emptyForm()
      } finally {
        this.savingShowing = false
      }
    },

    async removeShowing (id) {
      if (!confirm('Delete this screening? This cannot be undone.')) return
      await this.$store.dispatch('deleteShowing', id)
    }
  },

  created () {
    this.$store.dispatch('listenForShowings')
    this.$store.dispatch('listenForReservations')
  }
}
</script>

<style lang="scss" scoped>
.admin-wrap {
  min-height: 100vh;
  background-color: #280003;
  overflow-x: hidden;
}

h2 {
  color: #fff;
}

h5 {
  color: var(--color-tan);

  &.border-bottom {
    border-color: rgba(212, 169, 122, 0.25) !important;
  }
}

.text-muted {
  color: rgba(255, 255, 255, 0.45) !important;
}

.fst-italic {
  color: rgba(255, 255, 255, 0.45);
}

.form-label {
  color: #fff;
}

.form-control {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;

  &::placeholder { color: rgba(255,255,255,0.3); }
  &:focus { color: #fff; background-color: rgba(255,255,255,0.12); }
}

.back-link {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  text-decoration: none;
  &:hover { color: #fff; }
}

.admin-tabs {
  display: flex;
  gap: 0.25rem;
}

.admin-tab {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  padding: 0.3rem 0.9rem;
  cursor: pointer;
  transition: all 0.15s;

  &.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--color-tan);
    color: var(--color-tan);
  }

  &:not(.active):hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
  }
}

.screening-form {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(212, 169, 122, 0.2);
  border-radius: 8px;
  padding: 1.5rem;

  h5 { color: var(--color-tan); margin-bottom: 1rem; }
}


.selected-movie-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  border: 1px solid rgba(212, 169, 122, 0.2);
}

.selected-poster-thumb {
  width: 48px;
  border-radius: 3px;
  flex-shrink: 0;
}

.selected-movie-title {
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
}

.btn-clear-selection {
  background: none;
  border: none;
  color: var(--color-tan);
  font-size: 0.75rem;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 0.2rem;
  display: block;

  &:hover { color: #fff; }
}

.poster-results {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.poster-thumb {
  position: relative;
  width: 80px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.15s;

  &:hover { border-color: var(--color-tan); }
  &.selected { border-color: var(--color-orange); }

  img {
    width: 100%;
    display: block;
  }
}

.poster-thumb-empty {
  width: 80px;
  height: 120px;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: rgba(255,255,255,0.3);
  text-align: center;
  padding: 0.25rem;
}

.poster-thumb-year {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 0.65rem;
  text-align: center;
  padding: 0.1rem 0;
}

.field-hint {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
  font-weight: normal;
}

.showing-row-admin {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 1rem;
}

.showing-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.showing-movie {
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
}

.showing-meta {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8rem;
}

.showing-actions {
  flex-shrink: 0;
}

.action-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: #fff;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &--danger {
    border-color: rgba(176, 9, 14, 0.6);
    color: #ff8080;

    &:hover {
      background: rgba(176, 9, 14, 0.2);
    }
  }
}

.edit-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  color: #fff;
  font-size: 0.85rem;
  padding: 0.2rem 0.4rem;
  width: 100%;

  &--narrow {
    width: 4rem;
  }
}

.edit-row {
  background: rgba(255, 255, 255, 0.04);
}

.col-email {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 30%;
}

@media (max-width: 575px) {
  .col-index,
  .col-submitted {
    display: none;
  }
}

.table {
  --bs-table-bg: transparent;
  --bs-table-color: #fff;
  --bs-table-hover-bg: rgba(255, 255, 255, 0.05);
  --bs-table-hover-color: #fff;
  --bs-table-striped-color: #fff;
  color: #fff;

  thead th {
    color: var(--color-tan);
    border-color: rgba(212, 169, 122, 0.25);
  }

  td, th {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.08);
  }
}
</style>
