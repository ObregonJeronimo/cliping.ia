// probe: la MISMA frase dibujada dos veces en el mismo cuadro (offer.flash sin promo).
// Se usa el arquetipo `evento` TAL CUAL esta en tools/director-storyboard-check.mjs.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { normalizePageModel, CANVAS } from '../../src/director/core/schema.js'
import { buildGuion } from '../../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../../src/director/core/composer.js'
import { deriveLook } from '../../src/director/kit/look.js'
import { drawScene } from '../../src/director/render/draw.js'
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, '..', 'fonts')) } catch {}
const OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
const W = CANVAS.W, H = CANVAS.H
const makeCanvas = (w, h) => createCanvas(w, h)

const EVENTO = { brand: 'Vértigo', url: 'https://vertigo.club/', dna: { palette: { accent: '#e11d74' }, modernidad: ['brutalist'], mood: { energia: 0.95 } }, semantica: { queHace: 'Line up internacional todos los sábados', tipoNegocio: 'evento', modeloUso: 'compra', features: [{ titulo: 'Barra premium' }, { titulo: 'Sonido Funktion-One' }], oferta: { urgencia: 'Últimas entradas' }, pruebas: { stats: [{ valor: '2500', etiqueta: 'personas por noche' }] }, cta: 'Conseguí tu entrada' } }
const pm = normalizePageModel(EVENTO)

let dup = 0, total = 0, tile = null
for (let s = 1; s <= 12; s++) {
  const seed = (s * 3266489917) >>> 0
  const look = deriveLook(pm, seed)
  const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
  const sc = sb.scenes.find(x => x.escena === 'offer.flash')
  if (!sc) continue
  total++
  const textos = sc.layers.filter(l => l.kind === 'text' || l.kind === 'badge').map(l => String(l.text || '').trim().toLowerCase()).filter(Boolean)
  const rep = textos.filter((t, i) => textos.indexOf(t) !== i)
  if (rep.length) {
    dup++
    if (!tile) {
      const c = createCanvas(W, H), x = c.getContext('2d')
      drawScene(x, sc, look, W, H, { p: 1, makeCanvas, brand: pm.brand, images: new Map() })
      tile = c
      console.log(`seed ${seed}: capas de texto = ${JSON.stringify(sc.layers.filter(l => l.kind === 'text' || l.kind === 'badge').map(l => l.id + ':' + l.text))}`)
    }
  }
}
console.log(`\noffer.flash del arquetipo "evento" (fixture del gate): ${dup}/${total} seeds dibujan la MISMA frase dos veces en el mismo cuadro`)
if (tile) { const p = join(OUT, 'dup-offerflash.png'); writeFileSync(p, tile.toBuffer('image/png')); console.log('-> ' + p) }
