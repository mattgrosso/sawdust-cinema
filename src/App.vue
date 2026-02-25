<template>
  <router-view />
</template>

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

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-dark);
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
