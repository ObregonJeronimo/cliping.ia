import { createContext, useContext, useEffect, useState } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

// Emails con creditos de admin (99999)
const ADMIN_EMAILS = [
  'obregonjeronimo8@gmail.com',
  'thiagojoelp@gmail.com',
]

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await loadOrCreateProfile(firebaseUser)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function loadOrCreateProfile(firebaseUser) {
    const ref      = doc(db, 'users', firebaseUser.uid)
    const snap     = await getDoc(ref)
    const isAdmin  = ADMIN_EMAILS.includes(firebaseUser.email)

    if (!snap.exists()) {
      const newProfile = {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL:    firebaseUser.photoURL,
        credits:     isAdmin ? 99999 : 10,
        plan:        isAdmin ? 'admin' : 'free',
        createdAt:   serverTimestamp(),
      }
      await setDoc(ref, newProfile)
      setProfile(newProfile)
    } else {
      const data = snap.data()
      // Si es admin y no tiene los creditos correctos, actualizarlos
      if (isAdmin && data.plan !== 'admin') {
        const updated = { ...data, credits: 99999, plan: 'admin' }
        await setDoc(ref, updated, { merge: true })
        setProfile(updated)
      } else {
        setProfile(data)
      }
    }
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  async function logout() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
