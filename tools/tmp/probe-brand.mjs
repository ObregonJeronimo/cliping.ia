// probe: `brand` es el UNICO string del pagemodel sin cap de longitud en normalizePageModel.
// Se barren marcas REALISTAS (las que salen de <title> / siteName) y se mide que pasa al dibujarlas.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { normalizePageModel, CANVAS } from '../../src/director/core/schema.js'
import { buildGuion } from '../../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../../src/director/core/composer.js'
import { deriveLook } from '../../src/director/kit/look.js'
import { drawScene } from '../../src/director/render/draw.js'
import { telStart, telStop } from '../../src/director/core/text.js'
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, '..', 'fonts')) } catch {}
const OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
const W = CANVAS.W, H = CANVAS.H
const makeCanvas = (w, h) => createCanvas(w, h)

const MARCAS = [
  'Vértigo',
  'La Parrilla de Don Julio',
  'Estudio Jurídico Pérez & Asociados',            // 34
  'Clínica Odontológica Integral del Sur',         // 37
  'wwwmiempresadeconstruccionescomar',             // 33, UNA sola palabra (lo que deja pasar _clip_words)
  'Constructora del Litoral Sociedad Anonima',     // 41
]
console.log('marca'.padEnd(44), 'len', ' min px', ' @1080', ' elipsis', ' desborde')
const tiles = []
for (const brand of MARCAS) {
  const pm = normalizePageModel({ brand, url: 'https://sitio.com/', dna: { palette: { accent: '#6366f1' } }, semantica: { queHace: 'Servicio profesional para tu casa', tipoNegocio: 'servicio-local', modeloUso: 'contacto', cta: 'Contactanos' } })
  console.log('  (normalizePageModel deja brand en ' + pm.brand.length + ' chars)')
  let peor = null, elip = 0, des = 0
  for (let s = 1; s <= 8; s++) {
    const seed = (s * 3266489917) >>> 0
    const look = deriveLook(pm, seed)
    const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
    for (const sc of sb.scenes) {
      const c = createCanvas(W, H), x = c.getContext('2d')
      const tel = telStart()
      const rep = drawScene(x, sc, look, W, H, { p: 1, makeCanvas, brand: pm.brand, images: new Map() })
      telStop()
      des += rep.desbordes.length
      for (const t of tel) {
        if (String(t.raw).toLowerCase().indexOf(brand.slice(0, 12).toLowerCase()) < 0) continue
        if (t.ellip) elip++
        if (!peor || t.size < peor.size) peor = { size: t.size, escena: sc.escena, seed, canvas: c, str: t.str }
      }
    }
  }
  if (peor) {
    console.log(brand.padEnd(44), String(brand.length).padStart(3), String(peor.size.toFixed(1)).padStart(7), String((peor.size / H * 1920).toFixed(0)).padStart(6), String(elip).padStart(8), String(des).padStart(9), ' peor en ' + peor.escena)
    tiles.push({ label: `${brand.slice(0, 26)} -> ${peor.size.toFixed(1)}px ${peor.escena}`, c: peor.canvas })
  }
}
const CW = Math.round(W * 0.6), CH = Math.round(H * 0.6), GAP = 12, LBL = 28
const sheet = createCanvas(GAP + tiles.length * (CW + GAP), LBL + CH + 34)
const s = sheet.getContext('2d')
s.fillStyle = '#0b0b0d'; s.fillRect(0, 0, sheet.width, sheet.height)
s.fillStyle = '#e8e8ea'; s.font = 'bold 17px sans-serif'
s.fillText('marca larga -> peor cuadro (el `brand` no tiene cap en normalizePageModel)', GAP, 20)
tiles.forEach((t, i) => {
  const x = GAP + i * (CW + GAP)
  s.drawImage(t.c, x, LBL, CW, CH)
  s.fillStyle = '#c9ccd2'; s.font = '11px monospace'; s.fillText(t.label.slice(0, 44), x + 2, LBL + CH + 15)
})
const p = join(OUT, 'brand-largo.png')
writeFileSync(p, sheet.toBuffer('image/png'))
console.log('\n-> ' + p)
