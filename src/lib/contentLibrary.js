// contentLibrary.js — estado de CURACION de la biblioteca de contenido del motor Motion IA: el set
// de items ELIMINADOS por los admins (familias, fuentes, esquemas, formas, escenas, transiciones).
// Persistencia en dos capas: localStorage (instantaneo, por dispositivo, siempre funciona) + doc
// compartido de Firestore 'config/contentLibrary' (best-effort: sincroniza entre admins/dispositivos
// una vez desplegadas las reglas; si no, el try/catch cae a localStorage sin romper nada).
// El motor honra este set via makeMotionVideo({ disabled }) -> el contenido eliminado deja de salir.
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const LS_KEY = 'aemotion.library.removed'
const DOC = ['config', 'contentLibrary']

const readLS = () => { try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')) } catch { return new Set() } }
const writeLS = (set) => { try { localStorage.setItem(LS_KEY, JSON.stringify([...set])) } catch { /* quota / privado */ } }

// carga el set de eliminados: localStorage primero (instantaneo), luego Firestore (si accesible) y
// funde ambos. Devuelve un Set de ids.
export async function loadRemoved() {
  const local = readLS()
  try {
    const snap = await getDoc(doc(db, ...DOC))
    if (snap.exists() && Array.isArray(snap.data().removed)) {
      const merged = new Set([...local, ...snap.data().removed])
      writeLS(merged)
      return merged
    }
  } catch { /* reglas sin desplegar / offline -> solo localStorage */ }
  return local
}

// persiste el set completo (localStorage siempre; Firestore best-effort). Devuelve true si sincronizo.
export async function saveRemoved(set) {
  writeLS(set)
  try {
    await setDoc(doc(db, ...DOC), { removed: [...set], ts: Date.now() }, { merge: true })
    return true
  } catch {
    return false   // reglas sin desplegar: queda local, no rompe
  }
}
