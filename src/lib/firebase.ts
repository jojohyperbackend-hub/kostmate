import { initializeApp, getApps } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth"

// =====================
// CONFIG
// =====================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// =====================
// INIT — cegah duplicate app
// =====================
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

// =====================
// LOGIN GOOGLE
// =====================
export const loginGoogle = async () => {
  const result = await signInWithPopup(auth, provider)
  return result.user
}

// =====================
// LOGOUT
// =====================
export const logout = async () => {
  await signOut(auth)
}

// =====================
// GET USER SEKARANG
// =====================
export const getCurrentUser = (): User | null => {
  return auth.currentUser
}

// =====================
// LISTENER  untuk AUTH BERUBAH
// =====================
export const onUserChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

export { auth }