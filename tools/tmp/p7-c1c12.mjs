// PROBE 7 — corre los checks C1..C12 de DIRECCION-DE-ARTE §1 sobre storyboards reales y reporta
// cuantas escenas violan cada uno. Los que violan y ningun gate mira = brecha de verificacion.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, CANVAS } from '../../src/director/core/schema.js'
import { buildGuion } from '../../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../../src/director/core/composer.js'
import { deriveLook } from '../../src/director/kit/look.js'
import { drawScene, col } from '../../src/director/render/draw.js'
import { drawPlaca } from '../../src/director/render/plate.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, '..', 'fonts')) } catch {}

const ARQ = {
  saas: { brand: 'Urvid', url: 'https://urvid.app/', dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } }, semantica: { queHace: 'Convertí cualquier link en un reel listo para publicar', comoFunciona: ['Pegás el link de tu página', 'La IA analiza y escribe el guion', 'Descargás el video en 9:16'], tipoNegocio: 'saas', modeloUso: 'suscripcion', features: [{ titulo: 'Análisis automático' }, { titulo: 'Video en 30 segundos' }, { titulo: 'Sin editar nada' }, { titulo: 'Formato vertical' }], pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], testimonios: [{ texto: 'Pasamos de tardar un día a tener el reel en un café', firma: 'Marina' }], logosClientes: true }, cta: 'Probalo gratis' } },
  resto: { brand: 'La Parrilla de Don Julio', url: 'https://parrilla.com.ar/', dna: { palette: { accent: '#e0762a' }, mood: { energia: 0.4, calidez: 0.8 } }, semantica: { queHace: 'La parrilla que todo el barrio recomienda desde 1987', tipoNegocio: 'servicio-local', modeloUso: 'reserva', features: [{ titulo: 'Cortes premium' }, { titulo: 'Vinos de autor' }, { titulo: 'Patio al aire libre' }], pruebas: { stats: [{ valor: '4.9', etiqueta: 'en reseñas de Google' }] }, cta: 'Reservá tu mesa' } },
  tienda: { brand: 'Atelier', url: 'https://atelier.store/', dna: { palette: { accent: '#b45309' }, modernidad: ['editorial-photo'] }, semantica: { queHace: 'Prendas de confección local en series cortas', tipoNegocio: 'ecommerce', modeloUso: 'compra', features: [{ titulo: 'Algodón orgánico' }, { titulo: 'Series de 30' }], oferta: { promo: '20% en la primera compra', urgencia: 'Solo esta semana', precio: '$39.900' }, pruebas: { testimonios: [{ texto: 'La calidad se nota apenas la tocás', firma: 'Ana' }] }, cta: 'Ver colección' } },
  evento: { brand: 'Vértigo', url: 'https://vertigo.club/', dna: { palette: { accent: '#e11d74' }, modernidad: ['brutalist'], mood: { energia: 0.95 } }, semantica: { queHace: 'Line up internacional todos los sábados', tipoNegocio: 'evento', modeloUso: 'compra', features: [{ titulo: 'Barra premium' }, { titulo: 'Sonido Funktion-One' }], oferta: { urgencia: 'Últimas entradas' }, pruebas: { stats: [{ valor: '2500', etiqueta: 'personas por noche' }] }, cta: 'Conseguí tu entrada' } },
  pobre: { brand: 'Kiosco', url: 'https://kiosco.com/' },
}
const W = CANVAS.W, H = CANVAS.H
const makeCanvas = (w, h) => createCanvas(w, h)
const hsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h2 = 0
  if (d) h2 = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4)
  if (h2 < 0) h2 += 360
  return [h2, mx ? d / mx : 0, mx]
}
const hexHue = h => { const n = parseInt(h.slice(1), 16); return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255)[0] }
const dHue = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 360 - d) }

const K = {}
const fail = (c, ej) => { const x = K[c] || (K[c] = { n: 0, ej: [] }); x.n++; if (x.ej.length < 3) x.ej.push(ej) }
let nEsc = 0

for (const [n, raw] of Object.entries(ARQ)) {
  const pm = normalizePageModel(raw)
  for (let s = 1; s <= 10; s++) {
    const seed = (s * 2654435761) >>> 0
    const look = deriveLook(pm, seed)
    const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
    const bandas = []
    for (const sc of sb.scenes) {
      nEsc++
      const P = `${n}#${s}/${sc.escena}`
      const sub = sc.layers.filter(l => l.kind !== 'plate')

      // ---------- C1 jerarquia: <=3 clases de tamano, ratios 1.8 / 1.6 ----------
      const sizes = sub.filter(l => l.kind === 'text' && l.text).map(l => l.size).sort((a, b) => b - a)
      const clases = []
      for (const z of sizes) { const c = clases.find(c => Math.max(c, z) / Math.min(c, z) < 1.15); if (!c) clases.push(z) }
      if (clases.length > 3) fail('C1 E-HIER (>3 clases de tamano)', `${P}: ${clases.length} clases ${clases.map(x => (x * H).toFixed(0) + 'px')}`)
      for (let i = 1; i < clases.length && i < 3; i++) {
        const rt = clases[i - 1] / clases[i], min = i === 1 ? 1.8 : 1.6
        if (rt < min) fail(`C1 E-HIER (ratio N${i}/N${i + 1} < ${min})`, `${P}: ${rt.toFixed(2)} (${(clases[i - 1] * H).toFixed(0)}px vs ${(clases[i] * H).toFixed(0)}px)`)
      }

      // ---------- C3 una idea: <=12 palabras, <=3 bloques ----------
      const BLOQ = new Set(['text', 'heroObj', 'photo', 'badge', 'stepper', 'priceTag', 'logoRow'])
      const bloques = sub.filter(l => BLOQ.has(l.kind)).length
      const pal = sub.filter(l => l.kind === 'text' && ['kicker', 'mark'].indexOf(l.role) < 0 && l.text)
        .reduce((a, l) => a + String(l.text).trim().split(/\s+/).length, 0)
      if (pal > 12) fail('C3 E-IDEA (>12 palabras)', `${P}: ${pal} palabras`)
      if (bloques > 3) fail('C3 E-IDEA (>3 bloques)', `${P}: ${bloques} bloques`)

      // ---------- C5 alineacion: <=2 ejes ----------
      const anclas = sub.filter(l => !l.sangra).map(l => (l.align === 'center' ? (l.box[0] + l.box[2] / 2) : l.align === 'right' ? (l.box[0] + l.box[2]) : l.box[0]) * W).sort((a, b) => a - b)
      const cl = []
      for (const a of anclas) { const c = cl.find(c => Math.abs(a - c.lider) <= 4); if (c) c.n++; else cl.push({ lider: a, n: 1 }) }
      if (cl.length > 2) fail('C5 E-ALIGN (>2 ejes verticales)', `${P}: ${cl.length} ejes en x=${cl.map(c => c.lider.toFixed(0)).join(',')}`)

      // ---------- C9 colisiones entre textos ----------
      const tx = sub.filter(l => l.kind === 'text' && l.text)
      for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) {
        const a = tx[i].box, b = tx[j].box
        const ix = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]))
        const iy = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]))
        if (ix * iy > 1e-6) fail('C9 E-LAYER-COLLIDE (dos textos superpuestos)', `${P}: ${tx[i].id} x ${tx[j].id} area=${(ix * iy * 100).toFixed(2)}%`)
      }

      // ---------- C10 banda del focal ----------
      const foco = sub.find(l => l.focal)
      if (foco) {
        const y = foco.box[1] + foco.box[3] / 2
        bandas.push(y < 0.46 ? 'alta' : y < 0.57 ? 'centro' : 'baja')
        if (y < 0.34 || y >= 0.70) fail('C10 focal fuera de [0.34,0.70)', `${P}: y=${y.toFixed(3)}`)
      }

      // ---------- C12 ornamentos ----------
      const orn = sub.filter(l => (l.kind === 'text' && l.role === 'mark') || (l.kind === 'shape' && !l.matchKey && (l.box[2] * l.box[3]) < 0.06)).length
      if (orn > 1) fail('C12 E-ORNAMENTO (>1 firma)', `${P}: ${orn}`)

      // ---------- pixeles: C4 aire, C7 acento/hues, C8 densidad, C11 profundidad ----------
      const a = createCanvas(W, H), ca = a.getContext('2d'); drawPlaca(ca, look, W, H, {})
      const b = createCanvas(W, H), cb = b.getContext('2d'); drawScene(cb, sc, look, W, H, { p: 1, makeCanvas, brand: '', images: new Map() })
      const da = ca.getImageData(0, 0, W, H).data, db = cb.getImageData(0, 0, W, H).data
      let tinta = 0
      const bins = new Array(12).fill(0)
      let acc = 0
      const hAcc = hexHue(col(look, 'accent'))
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
        if (d >= 12) tinta++
        const [hh, ss, vv] = hsv(db[i], db[i + 1], db[i + 2])
        if (ss >= 0.25 && vv >= 0.12 / 1) { bins[Math.floor(hh / 30) % 12]++; if (dHue(hh, hAcc) <= 20) acc++ }
      }
      const N = W * H
      const aire = 1 - tinta / N
      const conFoto = sub.some(l => l.kind === 'photo' && l.sangra)
      if (aire < 0.35) fail('C4 E-AIRE (aire < 35%)', `${P}: aire ${(aire * 100).toFixed(1)}%`)
      if (tinta / N > (conFoto ? 0.65 : 0.55)) fail('C8 E-DENSIDAD (tinta total)', `${P}: ${(tinta / N * 100).toFixed(1)}%`)
      if (acc / N > 0.12) fail('C7 E-COLOR-EXCESO (superficie de acento > 12%)', `${P}: ${(acc / N * 100).toFixed(1)}%`)
      const hues = bins.filter(x => x / N >= 0.005).length
      if (hues > 2 && !conFoto) fail('C7 E-COLOR-EXCESO (hues > 2)', `${P}: ${hues} hues`)
    }
    // C10 a nivel VIDEO: <= ceil(N/2) escenas en banda 'centro'
    const cen = bandas.filter(x => x === 'centro').length
    if (cen > Math.ceil(bandas.length / 2)) fail('C10 E-MONOTONIA (banda centro > N/2)', `${n}#${s}: ${cen}/${bandas.length}`)
    // S1: <= 60% de escenas con eje central
    const centrados = sb.scenes.filter(sc => { const f = sc.layers.find(l => l.focal); return f && Math.abs(f.box[0] + f.box[2] / 2 - 0.5) < 0.02 }).length
    if (centrados / sb.scenes.length > 0.60) fail('S1 (>60% de escenas con eje central)', `${n}#${s}: ${centrados}/${sb.scenes.length}`)
    // S2: <= max(2, floor(N/4)) escenas con la misma clave de esqueleto
    const esq = new Map()
    for (const sc of sb.scenes) { const k = sc.layers.filter(l => l.kind !== 'plate').map(l => l.kind).sort().join('+'); esq.set(k, (esq.get(k) || 0) + 1) }
    const peor = Math.max(...esq.values()), tope = Math.max(2, Math.floor(sb.scenes.length / 4))
    if (peor > tope) fail('S2 (esqueleto repetido)', `${n}#${s}: ${peor} escenas comparten esqueleto (tope ${tope})`)
  }
}
console.log(`escenas medidas: ${nEsc}\n`)
for (const [k, v] of Object.entries(K).sort((a, b) => b[1].n - a[1].n)) {
  console.log(`${String(v.n).padStart(5)}  ${k}`)
  v.ej.forEach(e => console.log('        ' + e))
}
if (!Object.keys(K).length) console.log('(sin violaciones)')
