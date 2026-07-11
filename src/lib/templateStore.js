// templateStore — persistencia de templates autorados (admin). localStorage (instantaneo, por
// dispositivo) + Firestore compartido 'config/templates' (best-effort: sincroniza entre admins y deja
// que los motores los lean; requiere regla desplegada). Mismo patron que contentLibrary.
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const LS_KEY = 'templates.saved'
const DOC = ['config', 'templates']

const readLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const writeLS = (list) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch { /* quota */ } }
const byId = (list) => { const m = new Map(); for (const t of list) m.set(t.id, t); return m }

// carga la lista de templates: localStorage + Firestore (si accesible), fundidos por id (gana el ts mayor)
export async function loadTemplates() {
  const local = readLS()
  try {
    const snap = await getDoc(doc(db, ...DOC))
    if (snap.exists() && Array.isArray(snap.data().list)) {
      const m = byId(local)
      for (const t of snap.data().list) { const cur = m.get(t.id); if (!cur || (t.ts || 0) >= (cur.ts || 0)) m.set(t.id, t) }
      const merged = [...m.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0))
      writeLS(merged)
      return merged
    }
  } catch { /* sin reglas / offline -> local */ }
  return local.sort((a, b) => (b.ts || 0) - (a.ts || 0))
}

async function persist(list) {
  writeLS(list)
  try { await setDoc(doc(db, ...DOC), { list, ts: Date.now() }, { merge: true }); return true } catch { return false }
}

// upsert por id (asigna ts). Devuelve { list, synced }
export async function saveTemplate(tpl) {
  const list = readLS()
  const item = { ...tpl, ts: Date.now() }
  const i = list.findIndex(t => t.id === tpl.id)
  if (i >= 0) list[i] = item; else list.unshift(item)
  const synced = await persist(list)
  return { list: list.sort((a, b) => (b.ts || 0) - (a.ts || 0)), synced }
}

export async function deleteTemplate(id) {
  const list = readLS().filter(t => t.id !== id)
  const synced = await persist(list)
  return { list, synced }
}
