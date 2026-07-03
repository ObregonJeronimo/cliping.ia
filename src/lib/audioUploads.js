// audioUploads — audio SUBIDO por el usuario (Firebase Storage, privado por usuario). El archivo se guarda en
// users/{uid}/audio/{id}.{ext}; los metadatos en Firestore users/{uid}/audio_uploads/{id}. El clip del timeline guarda
// la URL inline -> el proyecto queda autocontenido (preview/export lo resuelven por la URL). Legal: cada subida es SOLO
// del propio usuario (nunca una biblioteca compartida) y sale horneada en SU video -> la responsabilidad es del usuario
// (ver Términos). Ver storage.rules (solo el dueño escribe/lee su subárbol).
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { storage, db } from './firebase'
import { registerBytes } from './audioAssets'

const MAX_BYTES = 15 * 1024 * 1024   // 15 MB — alcanza de sobra para un track/stinger; frena subir películas enteras
const EXT = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/flac': 'flac', 'audio/webm': 'webm' }

// decodifica el archivo para (a) validar que ES audio reproducible y (b) sacar la duración exacta. Devuelve { dur, bytes }.
async function inspect(file) {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) throw new Error('Tu navegador no soporta Web Audio.')
  const bytes = await file.arrayBuffer()
  const ctx = new AC()
  try {
    const buf = await ctx.decodeAudioData(bytes.slice(0))
    if (!buf || !buf.duration) throw new Error('vacío')
    return { dur: buf.duration, bytes }
  } catch (e) {
    throw new Error('No se pudo leer el audio (formato no soportado). Probá MP3, WAV, OGG o M4A.')
  } finally { try { ctx.close() } catch (e) { /* noop */ } }
}

// sube un archivo de audio del usuario. Devuelve el meta { id, name, kind, dur, url, path, ts }. Lanza con mensaje claro.
export async function uploadUserAudio(uid, file, kind = 'music') {
  if (!uid) throw new Error('Iniciá sesión para subir audio.')
  if (!file) throw new Error('No se eligió ningún archivo.')
  if (file.size > MAX_BYTES) throw new Error('El archivo supera 15 MB.')
  const { dur, bytes } = await inspect(file)   // valida audio + duración (antes de gastar la subida)
  const ext = EXT[file.type] || (file.name.split('.').pop() || 'audio').toLowerCase().slice(0, 5)
  const id = 'u' + Date.now().toString(36) + '_' + (bytes.byteLength % 100000).toString(36)
  const path = `users/${uid}/audio/${id}.${ext}`
  const sref = ref(storage, path)
  await uploadBytes(sref, file, { contentType: file.type || 'audio/mpeg' })
  const url = await getDownloadURL(sref)
  const name = (file.name.replace(/\.[^.]+$/, '') || 'Audio').slice(0, 40)
  const meta = { id, name, kind, dur: +dur.toFixed(2), url, path, ts: Date.now() }
  registerBytes('up:' + id, bytes)   // ya está en memoria -> preview/export de ESTA sesión sin re-fetch (evita CORS del bucket)
  await setDoc(doc(db, 'users', uid, 'audio_uploads', id), meta)
  return meta
}

// lista las subidas del usuario (más nuevas primero).
export async function listUserAudio(uid) {
  if (!uid) return []
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'audio_uploads'))
    return snap.docs.map(d => d.data()).sort((a, b) => (b.ts || 0) - (a.ts || 0))
  } catch (e) { return [] }
}

// borra una subida (archivo de Storage + metadato).
export async function deleteUserAudio(uid, meta) {
  if (!uid || !meta) return
  try { await deleteObject(ref(storage, meta.path)) } catch (e) { /* ya no existe -> ok */ }
  try { await deleteDoc(doc(db, 'users', uid, 'audio_uploads', meta.id)) } catch (e) { /* noop */ }
}
