// VENDOR CSS FIRST, AND IT HAS TO STAY THERE. Vite concatenates stylesheets
// in module-graph order, so whatever is imported first ends up EARLIEST in
// app.css — and between two rules of equal specificity the later one wins.
// Below the App.vue import, Bootstrap's `body { background-color:
// var(--bs-body-bg) }` landed after App.vue's `body { background-color:
// #280003 }` and the page went back to Bootstrap's default. Vue CLI put
// vendor CSS in its own file and loaded it first, which is why this only
// started mattering with the move to Vite (2026-09-14). Found by
// tools/vite-sanity.mjs's css-order check.
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap'

import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import router from './router'

const app = createApp(App)
app.use(store)
app.use(router)
app.mount('#app')
