// Biblioteca · adaptador "Animaciones FX" — showcase de las animaciones calibre AE (src/templates/fx.js).
// Cada item se previsualiza con un frame REAL de la animación (función pura de t) y se anima al hover.
// build() -> { key, label, note, categories:[{ key, title, note, items:[{ id, label, meta, spec }] }] }
import { frame } from './common.js'
import { FX, FX_CATS, drawFX } from '../../../templates/fx.js'

// paleta de muestra (la firma violeta->azul del prototipo de gelatina). Cuando se usen como objetos del
// editor de templates adoptarán la paleta de la marca; acá se muestran con esta identidad.
const PAL = { bg: '#0a0c12', surface: '#12151d', ink: '#e9ebf1', dim: '#8b93a5', accent: '#7c3aed', accent2: '#2563eb', onAccent: '#ffffff' }
const SIZE_K = 1.6   // escala para llenar bien el lienzo de preview (405x720 lógico)

function paintBg(ctx) { const g = ctx.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, '#0c1018'); g.addColorStop(1, '#080a0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 405, 720) }

export default function buildFx() {
  const catMap = new Map(FX_CATS.map(c => [c.key, { key: c.key, title: c.title, note: c.note, items: [] }]))
  for (const f of FX) {
    const params = { ...f.params, size: Math.round((f.params?.size || 50) * SIZE_K) }
    const spec = {
      dur: f.dur, still: f.dur * 0.45,
      draw: (ctx, t) => { frame(ctx); paintBg(ctx); drawFX(ctx, f.id, t, f.dur, { x: 202, y: 360, pal: PAL, params }) },
    }
    const bucket = catMap.get(f.cat) || catMap.get('liquido')
    bucket.items.push({ id: 'fx|' + f.id, label: f.label, meta: f.dur + 's · loop', spec })
  }
  return {
    key: 'fx', label: 'Animaciones FX',
    note: FX.length + ' animaciones de movimiento calibre After Effects — función pura de t, deterministas. Pasá el mouse para verlas en loop. Pronto usables como objetos en el editor de templates.',
    categories: [...catMap.values()].filter(c => c.items.length),
  }
}
