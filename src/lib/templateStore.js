// templateStore — persistencia de templates autorados (admin). localStorage (instantaneo, por
// dispositivo) + Firestore compartido (best-effort: sincroniza entre admins y deja que los motores
// los lean; requiere regla desplegada).
//
// Cada template es su PROPIO documento en la subcoleccion config/templates/items/{id}. Asi
// crear/editar/borrar toca SOLO ese id: dos admins (o dos dispositivos) nunca se pisan la lista
// entera. (Antes era un unico doc con la lista completa -> last-writer-wins borraba/resucitaba
// templates del otro.) De paso, los motores van a poder leer un template puntual por su id.
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

const LS_KEY = 'templates.saved'
const COL = ['config', 'templates', 'items']

const readLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const writeLS = (list) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch { /* quota */ } }
const byId = (list) => { const m = new Map(); for (const t of list) m.set(t.id, t); return m }

// ID legible y unico para un template (a la vista + lo usan los motores para referenciarlo entre
// muchos): formato TPL-XXXXXX con alfabeto sin caracteres ambiguos (0/O, 1/I/L). Se chequea contra
// los ids existentes y se regenera si colisiona. Es una accion de AUTORIA (no del render) -> puede
// usar tiempo/azar sin romper el determinismo del motor.
const ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export function makeTemplateId(existing = []) {
  const taken = new Set(existing)
  const draw = () => { let s = 'TPL-'; for (let i = 0; i < 6; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)]; return s }
  for (let tries = 0; tries < 60; tries++) { const id = draw(); if (!taken.has(id)) return id }
  return 'TPL-' + Date.now().toString(36).toUpperCase().slice(-6)   // fallback improbable
}

// carga la lista: localStorage + subcoleccion de Firestore (si accesible), fundidos por id (gana el ts mayor)
export async function loadTemplates() {
  const local = readLS()
  try {
    const snap = await getDocs(collection(db, ...COL))
    const m = byId(local)
    snap.forEach(d => { const t = d.data(); if (!t || !t.id) return; const cur = m.get(t.id); if (!cur || (t.ts || 0) >= (cur.ts || 0)) m.set(t.id, t) })
    const merged = [...m.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0))
    writeLS(merged)
    return merged
  } catch { /* sin reglas / offline -> local */ }
  return local.sort((a, b) => (b.ts || 0) - (a.ts || 0))
}

// upsert por id (asigna ts). Escribe SOLO el doc de ese template. Devuelve { list, synced }
export async function saveTemplate(tpl) {
  const list = readLS()
  const item = { ...tpl, ts: Date.now() }
  const i = list.findIndex(t => t.id === tpl.id)
  if (i >= 0) list[i] = item; else list.unshift(item)
  writeLS(list)                                  // local siempre (sincrono, sobrevive al desmontaje)
  let synced = false
  try { await setDoc(doc(db, ...COL, tpl.id), item); synced = true } catch { /* offline -> queda local */ }
  return { list: list.sort((a, b) => (b.ts || 0) - (a.ts || 0)), synced }
}

// borra SOLO el doc de ese id (no toca los demas -> no resucita ni pisa lo de otro admin)
export async function deleteTemplate(id) {
  const list = readLS().filter(t => t.id !== id)
  writeLS(list)
  let synced = false
  try { await deleteDoc(doc(db, ...COL, id)); synced = true } catch { /* offline */ }
  return { list, synced }
}
