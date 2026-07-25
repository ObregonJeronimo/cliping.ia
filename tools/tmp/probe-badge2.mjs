// probe: trazar EXACTAMENTE como se llega a 8px en la pildora de urgencia
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, CANVAS } from '../../src/director/core/schema.js'
import { buildGuion } from '../../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../../src/director/core/composer.js'
import { deriveLook } from '../../src/director/kit/look.js'
import { drawScene } from '../../src/director/render/draw.js'
import { telStart, telStop } from '../../src/director/core/text.js'
import { fitFont, fontStr, wordTrim } from '../../src/director/core/text.js'
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, '..', 'fonts')) } catch {}
const W = CANVAS.W, H = CANVAS.H
const makeCanvas = (w, h) => createCanvas(w, h)

const URG = 'Promoción válida solo por 48 horas'
const pm = normalizePageModel({
  brand: 'Acme', url: 'https://acme.com/',
  dna: { palette: { accent: '#e11d74' }, mood: { energia: 0.9 } },
  semantica: { queHace: 'Todo lo que necesitas', tipoNegocio: 'ecommerce', modeloUso: 'compra', oferta: { urgencia: URG }, cta: 'Comprar' },
})
const seed = 104729
const look = deriveLook(pm, seed)
const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
const sc = sb.scenes.find(s => s.escena === 'offer.flash')
const badge = sc.layers.find(l => l.kind === 'badge')
console.log('capa badge:', JSON.stringify({ id: badge.id, box: badge.box, size: badge.size, text: badge.text }))
const [x, y, w, h] = [badge.box[0] * W, badge.box[1] * H, badge.box[2] * W, badge.box[3] * H]
const size = Math.max(9, badge.size * H)
const fnt = look.fonts.support
const min = Math.max(9, size * 0.42)
const c = createCanvas(W, H), ctx = c.getContext('2d')
const s1 = fitFont(ctx, badge.text.toUpperCase(), size, w * 0.78, min, 700, fnt, 0)
console.log(`caja px: w=${w.toFixed(1)} h=${h.toFixed(1)} · size pedido=${size.toFixed(2)} · min=${min.toFixed(2)} · fuente=${fnt}`)
console.log(`fitFont(capaBadge) -> ${s1}  ${s1 < min ? '<-- POR DEBAJO DEL PISO ' + min.toFixed(2) : ''}`)
ctx.font = fontStr(700, s1, fnt)
const txt = wordTrim(ctx, badge.text.toUpperCase(), w * 0.78, s1, 700, fnt, 0)
console.log(`wordTrim -> ${JSON.stringify(txt)} (ancho ${ctx.measureText(txt).width.toFixed(1)} en maxW ${(w * 0.78).toFixed(1)})`)

const tel = telStart()
drawScene(ctx, sc, look, W, H, { p: 1, makeCanvas, brand: pm.brand, images: new Map() })
telStop()
for (const t of tel) console.log(`  dibujado: ${t.size.toFixed(2)}px  maxW=${t.maxW.toFixed(1)}  w=${t.w.toFixed(1)}  ${JSON.stringify(t.str.slice(0, 44))}`)
