// audioAssets — librería de audio REAL (archivos), complementa los SFX SINTETIZADOS de sfxLib.js. Todo es CC0
// (Kenney, dominio público): SFX de interfaz + impactos + jingles musicales. Uso comercial libre, sin atribución.
// Se sirven desde NUESTRO propio dominio (public/audio/…) — nunca hotlink — y se decodifican on-demand a AudioBuffer
// (cacheado por id+sampleRate). El export los mezcla igual que los sintetizados; el preview los agenda al vuelo.
import { SFX } from './sfxLib.js'

// manifest de los archivos. dur = duración exacta (ffprobe). kind: 'sfx' | 'music'. cat = grupo en la UI.
export const AUDIO_ASSETS = [
  // ---- SFX · Interfaz (Kenney "Interface Sounds", CC0) ----
  { id: 'ui-click', name: 'Click', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-click.ogg', dur: 0.10 },
  { id: 'ui-select', name: 'Select', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-select.ogg', dur: 0.04 },
  { id: 'ui-select-2', name: 'Select largo', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-select-2.ogg', dur: 1.94 },
  { id: 'ui-switch', name: 'Switch', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-switch.ogg', dur: 0.61 },
  { id: 'ui-switch-2', name: 'Switch 2', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-switch-2.ogg', dur: 0.61 },
  { id: 'ui-confirm', name: 'Confirmar', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-confirm.ogg', dur: 0.29 },
  { id: 'ui-confirm-2', name: 'Confirmar 2', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-confirm-2.ogg', dur: 0.32 },
  { id: 'ui-error', name: 'Error', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-error.ogg', dur: 0.16 },
  { id: 'ui-error-2', name: 'Error 2', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-error-2.ogg', dur: 0.10 },
  { id: 'ui-glass', name: 'Vidrio', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-glass.ogg', dur: 0.28 },
  { id: 'ui-glass-2', name: 'Vidrio 2', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-glass-2.ogg', dur: 0.11 },
  { id: 'ui-drop', name: 'Drop', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-drop.ogg', dur: 0.11 },
  { id: 'ui-toggle', name: 'Toggle', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-toggle.ogg', dur: 0.14 },
  { id: 'ui-tick', name: 'Tick', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-tick.ogg', dur: 0.02 },
  { id: 'ui-pluck', name: 'Pluck', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-pluck.ogg', dur: 0.10 },
  { id: 'ui-pluck-2', name: 'Pluck 2', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-pluck-2.ogg', dur: 0.16 },
  { id: 'ui-back', name: 'Back', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-back.ogg', dur: 0.06 },
  { id: 'ui-open', name: 'Abrir', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-open.ogg', dur: 0.15 },
  { id: 'ui-close', name: 'Cerrar', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-close.ogg', dur: 0.15 },
  { id: 'ui-bong', name: 'Bong', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-bong.ogg', dur: 0.12 },
  { id: 'ui-question', name: 'Pregunta', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-question.ogg', dur: 0.33 },
  { id: 'ui-scratch', name: 'Scratch', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-scratch.ogg', dur: 0.14 },
  { id: 'ui-glitch', name: 'Glitch UI', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-glitch.ogg', dur: 0.03 },
  { id: 'ui-maximize', name: 'Maximizar', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-maximize.ogg', dur: 0.26 },
  { id: 'ui-minimize', name: 'Minimizar', kind: 'sfx', cat: 'Interfaz', file: 'sfx/ui-minimize.ogg', dur: 0.26 },
  // ---- SFX · Impactos (Kenney "Impact Sounds", CC0) ----
  { id: 'hit-glass', name: 'Impacto vidrio', kind: 'sfx', cat: 'Impactos', file: 'sfx/hit-glass.ogg', dur: 0.54 },
  { id: 'hit-metal', name: 'Impacto metal', kind: 'sfx', cat: 'Impactos', file: 'sfx/hit-metal.ogg', dur: 0.27 },
  { id: 'hit-punch', name: 'Golpe', kind: 'sfx', cat: 'Impactos', file: 'sfx/hit-punch.ogg', dur: 0.65 },
  { id: 'hit-bell', name: 'Campana', kind: 'sfx', cat: 'Impactos', file: 'sfx/hit-bell.ogg', dur: 1.48 },
  { id: 'hit-wood', name: 'Impacto madera', kind: 'sfx', cat: 'Impactos', file: 'sfx/hit-wood.ogg', dur: 0.33 },
  { id: 'hit-plate', name: 'Impacto placa', kind: 'sfx', cat: 'Impactos', file: 'sfx/hit-plate.ogg', dur: 0.49 },
  { id: 'hit-soft', name: 'Impacto suave', kind: 'sfx', cat: 'Impactos', file: 'sfx/hit-soft.ogg', dur: 0.51 },
  // ---- Música · Jingles (Kenney "Music Jingles", CC0) — stingers cortos; los beds largos los sumás vos ----
  { id: 'jingle-chip', name: 'Chip 8-bit', kind: 'music', cat: 'Jingles', file: 'music/jingle-chip.ogg', dur: 1.76 },
  { id: 'jingle-chip-2', name: 'Chip 8-bit 2', kind: 'music', cat: 'Jingles', file: 'music/jingle-chip-2.ogg', dur: 0.91 },
  { id: 'jingle-hit', name: 'Hit orquestal', kind: 'music', cat: 'Jingles', file: 'music/jingle-hit.ogg', dur: 0.28 },
  { id: 'jingle-hit-2', name: 'Hit orquestal 2', kind: 'music', cat: 'Jingles', file: 'music/jingle-hit-2.ogg', dur: 0.28 },
  { id: 'jingle-pizzi', name: 'Pizzicato', kind: 'music', cat: 'Jingles', file: 'music/jingle-pizzi.ogg', dur: 0.49 },
  { id: 'jingle-pizzi-2', name: 'Pizzicato 2', kind: 'music', cat: 'Jingles', file: 'music/jingle-pizzi-2.ogg', dur: 0.56 },
  { id: 'jingle-sax', name: 'Sax', kind: 'music', cat: 'Jingles', file: 'music/jingle-sax.ogg', dur: 0.39 },
  { id: 'jingle-sax-2', name: 'Sax 2', kind: 'music', cat: 'Jingles', file: 'music/jingle-sax-2.ogg', dur: 0.37 },
  { id: 'jingle-steel', name: 'Steel drum', kind: 'music', cat: 'Jingles', file: 'music/jingle-steel.ogg', dur: 0.93 },
  { id: 'jingle-steel-2', name: 'Steel drum 2', kind: 'music', cat: 'Jingles', file: 'music/jingle-steel-2.ogg', dur: 1.55 },
]

export const ASSET_BY_ID = new Map(AUDIO_ASSETS.map(a => [a.id, a]))
export const isAsset = (id) => ASSET_BY_ID.has(id)

// librerías que consume la UI (picker). SFX = sintetizados + Kenney SFX; Música = jingles. { id, name, cat, dur }.
export const SFX_LIBRARY = [
  ...SFX.map(s => ({ id: s.id, name: s.name, cat: 'Sintetizados', dur: s.dur })),
  ...AUDIO_ASSETS.filter(a => a.kind === 'sfx').map(a => ({ id: a.id, name: a.name, cat: a.cat, dur: a.dur })),
]
export const MUSIC_LIBRARY = AUDIO_ASSETS.filter(a => a.kind === 'music').map(a => ({ id: a.id, name: a.name, cat: a.cat, dur: a.dur }))

// nombre legible de CUALQUIER clip (sintetizado o archivo) para mostrarlo en la lista del timeline.
const _NAME = new Map([...SFX.map(s => [s.id, s.name]), ...AUDIO_ASSETS.map(a => [a.id, a.name])])
export const clipLabel = (id) => _NAME.get(id) || id

// ---- carga/decodificación ----
// Vite sirve public/ en la raíz; import.meta.env.BASE_URL respeta el base del deploy (por si algún día va a un subpath).
const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/'
const assetUrl = (file) => (BASE.endsWith('/') ? BASE : BASE + '/') + 'audio/' + file

const _bytes = new Map()    // id -> Promise<ArrayBuffer> (fetch una sola vez)
const _buffers = new Map()  // id|sampleRate -> AudioBuffer (decodificado)

function fetchBytes(a) {
  let p = _bytes.get(a.id)
  if (!p) {
    p = fetch(assetUrl(a.file)).then(r => { if (!r.ok) throw new Error('audio ' + r.status); return r.arrayBuffer() })
    _bytes.set(a.id, p)
  }
  return p
}

// decodeAsset(ctx, id) -> Promise<AudioBuffer|null>. Cacheado por (id, sampleRate). decodeAudioData DETACHA el
// ArrayBuffer que recibe -> siempre se le pasa una COPIA (slice) para poder redecodificar en otro contexto.
export async function decodeAsset(ctx, id) {
  const a = ASSET_BY_ID.get(id); if (!a) return null
  const key = id + '|' + ctx.sampleRate
  const cached = _buffers.get(key); if (cached) return cached
  const bytes = await fetchBytes(a)
  const buf = await ctx.decodeAudioData(bytes.slice(0))
  _buffers.set(key, buf)
  return buf
}

// accesor SINCRONO desde cache (para agendar el preview en vivo sin await). null si aún no se decodificó.
export const cachedAsset = (id, sampleRate) => _buffers.get(id + '|' + sampleRate) || null
