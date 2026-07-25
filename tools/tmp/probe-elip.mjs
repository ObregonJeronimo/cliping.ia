// probe: DONDE se produce el "…" con una marca larga y por que.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { normalizePageModel, CANVAS } from '../../src/director/core/schema.js'
import { buildGuion } from '../../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../../src/director/core/composer.js'
import { deriveLook } from '../../src/director/kit/look.js'
import { drawScene, HERO } from '../../src/director/render/draw.js'
import { telStart, telStop, fitFont, wordTrim, fontStr } from '../../src/director/core/text.js'
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, '..', 'fonts')) } catch {}
const OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
const W = CANVAS.W, H = CANVAS.H
const makeCanvas = (w, h) => createCanvas(w, h)

const BRAND = 'Estudio Jurídico Pérez & Asociados'
const pm = normalizePageModel({ brand: BRAND, url: 'https://sitio.com/', dna: { palette: { accent: '#6366f1' } }, semantica: { queHace: 'Servicio profesional para tu casa', tipoNegocio: 'servicio-local', modeloUso: 'contacto', cta: 'Contactanos' } })
for (let s = 1; s <= 8; s++) {
  const seed = (s * 3266489917) >>> 0
  const look = deriveLook(pm, seed)
  const sb = composeStoryboard(pm, buildGuion(pm, seed), look, seed)
  for (const sc of sb.scenes) {
    const c = createCanvas(W, H), x = c.getContext('2d')
    const tel = telStart()
    drawScene(x, sc, look, W, H, { p: 1, makeCanvas, brand: pm.brand, images: new Map() })
    telStop()
    for (const t of tel.filter(t => t.ellip)) {
      const obj = sc.layers.find(l => l.kind === 'heroObj')
      console.log(`seed ${seed} · ${sc.escena} (obj ${obj ? obj.obj : '-'}) · size ${t.size.toFixed(1)} maxW ${t.maxW.toFixed(1)} -> ${JSON.stringify(t.str)}`)
      writeFileSync(join(OUT, `elip-${sc.escena}.png`), c.toBuffer('image/png'))
    }
  }
}

// --- replica del camino drawTextSinElidir para el objeto 'book'
console.log('\n--- camino de drawTextSinElidir (oBook: size 17, maxW BW*0.68, tracking 2, sin min) ---')
const ctx = createCanvas(600, 600).getContext('2d')
const BW = 170 + 0.5 * 30, maxW = BW * 0.68
const txt = BRAND.toUpperCase()
const fam = 'Archivo'
const s2 = fitFont(ctx, txt, 17, maxW, Math.max(9, 12), 800, fam, 2)
const trimmed = wordTrim(ctx, txt, maxW, s2, 800, fam, 2)
ctx.font = fontStr(800, s2, fam); ctx.letterSpacing = '2px'
console.log(`maxW=${maxW.toFixed(1)} · fitFont -> ${s2} · wordTrim -> ${JSON.stringify(trimmed)} (${ctx.measureText(trimmed).width.toFixed(1)}px)`)
// lo que hace drawText DESPUES: re-fitea desde `size` original con min por DEFECTO (12)
const s3 = fitFont(ctx, trimmed, 17, maxW, 12, 800, fam, 2)
ctx.font = fontStr(800, s3, fam); ctx.letterSpacing = '2px'
console.log(`drawText re-fitea: ${s3}px -> ancho ${ctx.measureText(trimmed).width.toFixed(1)} en maxW ${maxW.toFixed(1)} ${ctx.measureText(trimmed).width > maxW ? '  <-- NO ENTRA: clip() va a elidir' : ''}`)
