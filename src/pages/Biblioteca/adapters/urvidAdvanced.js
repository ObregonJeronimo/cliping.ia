// Biblioteca · adaptador URVID IA ADVANCED. Comparte el motor generativo de urvid (mismo catalogo:
// escenas, fondos, tipografia, color, etc.) + lo EXCLUSIVO del editor advanced: la biblioteca de
// AUDIO (SFX + musica, Kenney CC0) que se hornea en el video. Reusa las categorias de urvid y agrega
// la de audio (cards con play).
import buildUrvid from './urvid.js'
import { AUDIO_ASSETS } from '../../../lib/audioAssets.js'
import { fontStr } from '../../../aemotion/index.js'
import { frame } from './common.js'

export const KEY = 'urvid-adv'
const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/'
const audioUrl = (file) => (BASE.endsWith('/') ? BASE : BASE + '/') + 'audio/' + file

// preview de un clip de audio: barras pseudo-aleatorias (por id) coloreadas por tipo + nombre
function audioSpec(a) {
  const seed = [...a.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  const bars = 22
  const col = a.kind === 'music' ? '#a674ff' : '#4fd1a1'
  return {
    dur: 0, still: 0,
    draw: (ctx) => {
      frame(ctx); ctx.fillStyle = '#0d1016'; ctx.fillRect(0, 0, 405, 720)
      let s = seed
      const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
      const bw = 320 / bars, x0 = 42, mid = 300
      for (let i = 0; i < bars; i++) { const h = 30 + rnd() * 170; ctx.fillStyle = col; ctx.fillRect(x0 + i * bw, mid - h / 2, bw * 0.6, h) }
      ctx.fillStyle = '#e7e9ee'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = fontStr(700, 30, 'Inter'); ctx.fillText(a.name, 202, 470)
      ctx.fillStyle = col; ctx.font = fontStr(600, 16, 'Inter'); ctx.fillText((a.kind === 'music' ? 'MUSICA' : 'SFX') + ' · ' + a.cat, 202, 520)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = fontStr(500, 14, 'Inter'); ctx.fillText(a.dur.toFixed(2) + 's', 202, 560)
    },
  }
}

export default function build() {
  const urv = buildUrvid()
  const audioCat = {
    key: 'audio', title: 'Audio', note: 'SFX + musica (Kenney CC0) que se hornea en el video advanced.',
    items: AUDIO_ASSETS.map(a => ({
      id: KEY + '|audio:' + a.id, label: a.name, meta: (a.kind === 'music' ? 'musica' : 'sfx') + ' · ' + a.cat,
      spec: audioSpec(a), play: () => { try { const el = new Audio(audioUrl(a.file)); el.volume = 0.7; el.play() } catch { /* noop */ } },
    })),
  }
  return {
    key: KEY, label: 'urvid IA advanced',
    note: 'Mismo motor que urvid IA + el audio del editor. Curacion visual (no excluye de la generacion todavia).',
    categories: [audioCat, ...urv.categories],
  }
}
