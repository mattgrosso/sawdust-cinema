import { initializeApp } from 'firebase/app'
import { get, getDatabase, ref, update } from 'firebase/database'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { reactive } from 'vue'

const firebaseConfig = {
  apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
  authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VUE_APP_FIREBASE_APP_ID,
  databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL
}

export const DATABASE_URL = firebaseConfig.databaseURL

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

// Google sign-in exists only for the Admin page. Guests never sign in — the
// RSVP form is deliberately anonymous, and the public schedule is public.
// The bug button (2026-11-05) rides on a silent anonymous session instead,
// so a fixed-bug notice can find its way back to whoever reported it.
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export const authState = reactive({ ready: false, uid: null })
onAuthStateChanged(auth, (user) => {
  authState.uid = user?.uid || null
  authState.ready = true
})

// Who is allowed to see the guest list. Checked in the UI for a friendly
// screen, and enforced for real in database.rules.json — this constant is in
// the public bundle and is not a security boundary.
export const ADMIN_EMAIL = 'mattgrosso@gmail.com'

// ---- the bug button's identity (the house pattern, from School Hunt)
export const bugReportToken = async ({ fresh = false } = {}) => {
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user
  return user.getIdToken(fresh)
}
export const bugReporter = async () => {
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user
  return { uid: user.uid, displayName: user.displayName || null, email: user.email || null }
}
export const currentUid = () => auth.currentUser?.uid || null
export const readResolutions = async (uid) => (await get(ref(db, `bugReportResolutions/${uid}`))).val()
export const markResolutionsSeen = (uid, ids) => {
  const updates = {}
  ids.forEach((id) => { updates[`bugReportResolutions/${uid}/${id}/seen`] = true })
  return update(ref(db), updates)
}
