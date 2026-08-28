import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
  authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VUE_APP_FIREBASE_APP_ID,
  databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

// Auth exists only for the Admin page. Guests never sign in — the RSVP form
// is deliberately anonymous, and the public schedule is public.
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Who is allowed to see the guest list. Checked in the UI for a friendly
// screen, and enforced for real in database.rules.json — this constant is in
// the public bundle and is not a security boundary.
export const ADMIN_EMAIL = 'mattgrosso@gmail.com'
