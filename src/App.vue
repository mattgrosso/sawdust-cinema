<template>
  <router-view />
  <BugButton />
  <BugResolutionNotice />
</template>

<script>
import { computed } from 'vue'
import BugButton from '@/components/BugButton.vue'
import BugResolutionNotice from '@/components/BugResolutionNotice.vue'

export default {
  name: 'App',
  components: { BugButton, BugResolutionNotice },
  provide () {
    // What a bug report carries besides the words: where they were, how many
    // screenings were up, and which reservations this browser holds (ids
    // only — no names or emails, those stay in the private half).
    const store = this.$store
    const route = computed(() => this.$route.fullPath)
    return {
      bugSnapshot: () => ({
        route: route.value,
        showings: Object.keys(store.state.showings || {}).length,
        tickets: (store.state.tickets || []).map((t) => t.id),
        rsvpModalOpen: store.state.rsvpModalOpen
      })
    }
  }
}
</script>
<style lang="scss">
:root {
  --color-espresso: #1e140e;
  --color-orange:   #eb8328;
  --color-red:      #b0090e;
  --color-parchment: #f5ede3;
  --color-tan:      #d4a97a;
  --color-dark:     #1e140e;
  --color-walnut:   #6c4f2e;
}

body {
  background-color: #280003;
}

html, body {
  min-height: 100%;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-dark);
  min-height: 100vh;
  background-color: #280003;
}

/* Override Bootstrap primary color */
.btn-primary {
  background-color: var(--color-red) !important;
  border-color: var(--color-red) !important;
  color: #fff !important;

  &:hover, &:focus {
    background-color: #8a070b !important;
    border-color: #8a070b !important;
  }
}

.btn-outline-secondary {
  color: var(--color-red) !important;
  border-color: var(--color-red) !important;

  &:hover {
    background-color: var(--color-red) !important;
    color: #fff !important;
  }
}

/* Badge overrides */
.badge {
  &.bg-success {
    background-color: var(--color-red) !important;
  }
  &.bg-warning {
    background-color: var(--color-tan) !important;
    color: var(--color-dark) !important;
  }
  &.bg-danger {
    background-color: #6a0005 !important;
  }
}

/* Form controls */
.form-control:focus {
  border-color: var(--color-red) !important;
  box-shadow: 0 0 0 0.2rem rgba(176, 9, 14, 0.25) !important;
}
.form-check-input {
  &:checked {
    background-color: var(--color-red) !important;
    border-color: var(--color-red) !important;
    box-shadow: 0 0 0 0.2rem rgba(176, 9, 14, 0.25) !important;
  }
}
</style>
