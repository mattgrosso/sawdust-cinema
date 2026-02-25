import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyAhjnbSpqEqAd1MTuu3AsZmnlFQJoxSA9k',
  authDomain: 'sawdust-cinema.firebaseapp.com',
  projectId: 'sawdust-cinema',
  storageBucket: 'sawdust-cinema.firebasestorage.app',
  messagingSenderId: '1091670075793',
  appId: '1:1091670075793:web:5e63724d85376f89811230',
  databaseURL: 'https://sawdust-cinema-default-rtdb.firebaseio.com'
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
