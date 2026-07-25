// PROBE 7b — desambigua C7: ¿la superficie de acento viene de la PLACA o del contenido?
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
const saas = { brand: 'Urvid', url: 'https://urvid.app/', dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } }, semantica: { queHace: 'Convertí cualquier link en un reel listo para publicar', comoFunciona: ['Pegás el link de tu página', 'La IA analiza y escribe el guion', 'Descargás el video en 9:16'], tipoNegocio: 'saas', modeloUso: 'suscripcion', features: [{ titulo: 'Análisis automático' }, { titulo: 'Video en 30 segundos' }, { titulo: 'Sin editar nada' }, { titulo: 'Formato vertical' }], pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], testimonios: [{ texto: 'Pasamos de tardar un día a tener el reel en un café', firma: 'Marina' }], logosClientes: true }, cta: 'Probalo gratis' } }
const W = CANVAS.W, H = CANVAS.H, makeCanvas = (w, h) => createCanvas(w, h)
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h2 = 0; if (d) h2 = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4); if (h2 < 0) h2 += 360; return [h2, mx ? d / mx : 0, mx] }
const hexHue = h => { const n = parseInt(h.slice(1), 16); return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255)[0] }
const dHue = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 360 - d) }
const pm = normalizePageModel(saas)
console.log('seed/escena              placa   acento(frame)  acento(solo placa)  acento(solo contenido)')
for (let s = 1; s <= 6; s++) {
  const seed = (s * 2654435761) >>> 0
  const look = deriveLook(pm, seed)
  const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
  const hAcc = hexHue(col(look, 'accent'))
  for (const sc of sb.scenes.slice(0, 3)) {
    const a = createCanvas(W, H), ca = a.getContext('2d'); drawPlaca(ca, look, W, H, {})
    const b = createCanvas(W, H), cb = b.getContext('2d'); drawScene(cb, sc, look, W, H, { p: 1, makeCanvas, brand: '', images: new Map() })
    const da = ca.getImageData(0, 0, W, H).data, db = cb.getImageData(0, 0, W, H).data
    let full = 0, plate = 0, cont = 0
    for (let i = 0; i < da.length; i += 4) {
      const esCont = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) >= 12
      const [h1, s1, v1] = hsv(db[i], db[i + 1], db[i + 2])
      const [h2, s2, v2] = hsv(da[i], da[i + 1], da[i + 2])
      if (s1 >= 0.25 && v1 >= 0.12 && dHue(h1, hAcc) <= 20) { full++; if (esCont) cont++ }
      if (s2 >= 0.25 && v2 >= 0.12 && dHue(h2, hAcc) <= 20) plate++
    }
    const N = W * H
    console.log(`${(s + '/' + sc.escena).padEnd(24)} ${look.placa.padEnd(7)} ${(full / N * 100).toFixed(1).padStart(9)}% ${(plate / N * 100).toFixed(1).padStart(17)}% ${(cont / N * 100).toFixed(1).padStart(21)}%`)
  }
}
